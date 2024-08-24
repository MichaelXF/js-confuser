import { PluginObj } from "@babel/core";
import { NodePath } from "@babel/traverse";
import { PluginArg } from "./plugin";
import * as babelTypes from "@babel/types";
import Template from "../templates/template";
import { computeProbabilityMap } from "../probability";
import { Order } from "../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.VariableMasking);

  const transformFunction = (path: NodePath<babelTypes.Function>) => {
    // Do not apply to getter/setter methods
    if (path.isObjectMethod() && path.node.kind !== "method") {
      return;
    }

    // Do not apply to class getters/setters
    if (path.isClassMethod() && path.node.kind !== "method") {
      return;
    }

    // Do not apply to async or generator functions
    if (path.node.generator || path.node.async) {
      return;
    }

    // Do not apply to functions with rest parameters or destructuring
    if (path.node.params.some((param) => !babelTypes.isIdentifier(param))) {
      return;
    }

    const functionName =
      ((path.isFunctionDeclaration() || path.isFunctionExpression()) &&
        path.node.id?.name) ??
      "anonymous";

    if (
      !computeProbabilityMap(me.options.variableMasking, (x) => x, functionName)
    ) {
      return;
    }

    const stackName = me.generateRandomIdentifier() + "_stack";
    const stackMap = new Map<string, number>();

    for (const param of path.node.params) {
      stackMap.set((param as babelTypes.Identifier).name, 0);
    }

    path.traverse({
      BindingIdentifier(identifierPath) {
        const binding = identifierPath.scope.getBinding(
          identifierPath.node.name
        );

        if (!binding) {
          return;
        }

        if (binding.constantViolations.length > 0) {
          return;
        }

        if (binding.scope !== path.scope) {
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

          binding.path.parentPath.replaceWith(
            new Template(`{stackName}[{stackIndex}] = {value}`).single({
              stackName: stackName,
              stackIndex: stackIndex,
              value:
                (binding.path.node as any).init ??
                babelTypes.identifier("undefined"),
            })
          );
        }

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

          refPath.replaceWith(
            new Template(`{stackName}[{stackIndex}]`).single({
              stackName: stackName,
              stackIndex: stackIndex,
            })
          );
        });

        identifierPath.scope.removeBinding(identifierPath.node.name);
      },
    });

    path.node.params = [
      babelTypes.restElement(babelTypes.identifier(stackName)),
    ];

    path.scope.registerBinding("param", path.get("params.0") as NodePath, path);
  };

  return {
    visitor: {
      Function: {
        exit(path: NodePath<babelTypes.Function>) {
          transformFunction(path);
        },
      },
    },
  };
};
