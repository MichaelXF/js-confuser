import { PluginObj } from "@babel/core";
import { NodePath } from "@babel/traverse";
import { PluginArg } from "./plugin";
import * as t from "@babel/types";
import Template from "../templates/template";
import { computeProbabilityMap } from "../probability";
import { Order } from "../order";
import { NodeSymbol, UNSAFE } from "../constants";
import { getFunctionName } from "../utils/ast-utils";
import { isFunctionStrictMode } from "../utils/function-utils";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.VariableMasking);

  const transformFunction = (fnPath: NodePath<t.Function>) => {
    // Do not apply to getter/setter methods
    if (fnPath.isObjectMethod() && fnPath.node.kind !== "method") {
      return;
    }

    // Do not apply to class getters/setters
    if (fnPath.isClassMethod() && fnPath.node.kind !== "method") {
      return;
    }

    // Do not apply to async or generator functions
    if (fnPath.node.generator || fnPath.node.async) {
      return;
    }

    // Do not apply to functions with rest parameters or destructuring
    if (fnPath.node.params.some((param) => !t.isIdentifier(param))) {
      return;
    }

    // Do not apply to 'use strict' functions
    if (isFunctionStrictMode(fnPath)) return;

    // Do not apply to functions marked unsafe
    if ((fnPath.node as NodeSymbol)[UNSAFE]) return;

    const functionName = getFunctionName(fnPath);

    if (
      !computeProbabilityMap(me.options.variableMasking, (x) => x, functionName)
    ) {
      return;
    }

    const stackName = me.generateRandomIdentifier() + "_varMask";
    const stackMap = new Map<string, number>();
    let needsStack = false;

    for (const param of fnPath.node.params) {
      stackMap.set((param as t.Identifier).name, stackMap.size);
    }

    fnPath.traverse({
      BindingIdentifier(identifierPath) {
        const binding = identifierPath.scope.getBinding(
          identifierPath.node.name
        );

        if (!binding) {
          return;
        }

        if (binding.kind === "const" && binding.constantViolations.length > 0) {
          return;
        }

        if (binding.scope !== fnPath.scope) {
          return;
        }

        let stackIndex = stackMap.get(identifierPath.node.name);

        if (typeof stackIndex === "undefined") {
          if (
            !binding.path.isVariableDeclarator() ||
            !binding.path.parentPath.isVariableDeclaration() ||
            binding.path.parentPath.node.declarations.length !== 1
          ) {
            return;
          }

          stackIndex = stackMap.size;
          stackMap.set(identifierPath.node.name, stackIndex);

          let value: t.Expression =
            (binding.path.node as any).init ?? t.identifier("undefined");

          needsStack = true;
          binding.path.parentPath.replaceWith(
            new Template(`{stackName}[{stackIndex}] = {value}`).single({
              stackName: stackName,
              stackIndex: stackIndex,
              value: value,
            })
          );
        }

        binding.constantViolations.forEach((constantViolation) => {
          switch (constantViolation.type) {
            case "AssignmentExpression":
            case "UpdateExpression":
              // Find the Identifier that is being assigned to
              // and replace it with the stack variable
              constantViolation.traverse({
                Identifier(path) {
                  if (path.node.name === identifierPath.node.name) {
                    path.replaceWith(
                      new Template(`{stackName}[{stackIndex}]`).expression({
                        stackName: stackName,
                        stackIndex: stackIndex,
                      })
                    );
                  }
                },
              });

              break;
            default:
              throw new Error(
                `Unsupported constant violation type: ${constantViolation.type}`
              );
          }
        });

        binding.referencePaths.forEach((refPath) => {
          if (!refPath.isReferencedIdentifier()) return;

          if (
            refPath.getFunctionParent() !== binding.path.getFunctionParent()
          ) {
            return;
          }

          const refBiding = refPath.scope.getBinding(refPath.node.name);
          if (refBiding !== binding) {
            return;
          }

          const memberExpression = new Template(
            `{stackName}[{stackIndex}]`
          ).expression<t.MemberExpression>({
            stackName: stackName,
            stackIndex: stackIndex,
          });

          needsStack = true;
          if (
            t.isCallExpression(refPath.parent) &&
            refPath.parent.callee === refPath.node
          ) {
            refPath.parent.callee = t.memberExpression(
              memberExpression,
              t.stringLiteral("call"),
              true
            );
            refPath.parent.arguments.unshift(t.thisExpression());
          } else {
            refPath.replaceWith(memberExpression);
          }
        });

        identifierPath.scope.removeBinding(identifierPath.node.name);
      },
    });

    if (!needsStack) return;

    fnPath.node.params = [t.restElement(t.identifier(stackName))];

    fnPath.scope.registerBinding(
      "param",
      fnPath.get("params.0") as NodePath,
      fnPath
    );
  };

  return {
    visitor: {
      Function: {
        exit(path: NodePath<t.Function>) {
          transformFunction(path);
        },
      },
    },
  };
};
