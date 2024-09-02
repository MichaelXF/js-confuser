import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import {
  ensureComputedExpression,
  getFunctionName,
  prepend,
} from "../utils/ast-utils";
import { PluginArg } from "./plugin";
import { computeProbabilityMap } from "../probability";
import { Order } from "../order";
import { getRandomInteger } from "../utils/random-utils";
import { NodeSymbol, UNSAFE } from "../constants";
import { computeFunctionLength } from "../utils/function-utils";
import { SetFunctionLengthTemplate } from "../templates/setFunctionLengthTemplate";
import { ok } from "assert";
import { Scope } from "@babel/traverse";

const SKIP = Symbol("skip");
interface NodeSkip {
  [SKIP]?: boolean;
}

function skipNode<T extends t.Node>(node: T): T {
  (node as NodeSkip)[SKIP] = true;
  return node;
}

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Flatten);

  function flattenFunction(fnPath: NodePath<t.Function>) {
    // Skip if already processed
    if (me.isSkipped(fnPath)) return;

    // Don't apply to generator functions
    if (fnPath.node.generator) return;

    // Skip getter/setter methods
    if (fnPath.isObjectMethod()) {
      if (fnPath.node.kind !== "method") return;
    }

    // Do not apply to arrow functions
    if (t.isArrowFunctionExpression(fnPath.node)) return;
    if (!t.isBlockStatement(fnPath.node.body)) return;

    // Skip if marked as unsafe
    if ((fnPath.node as NodeSymbol)[UNSAFE]) return;

    var program = fnPath.findParent((p) =>
      p.isProgram()
    ) as NodePath<t.Program>;

    let functionName = getFunctionName(fnPath);
    if (!t.isValidIdentifier(functionName, true)) {
      functionName = "anonymous";
    }

    if (!computeProbabilityMap(me.options.flatten, functionName)) {
      return;
    }

    me.log("Transforming", functionName);

    const flatObjectName = `${me.getPlaceholder()}_flat_object`;
    const newFnName = `${me.getPlaceholder()}_flat_${functionName}`;

    function generateProp(originalName) {
      var newProp;
      do {
        newProp = "" + originalName + getRandomInteger(0, 10);
        // newProp = getRandomString(6);
      } while (
        standardProps.has(newProp) ||
        typeofProps.has(newProp) ||
        functionCallProps.has(newProp)
      );

      return newProp;
    }

    const standardProps = new Map<string, string>();
    const typeofProps = new Map<string, string>();
    const functionCallProps = new Map<string, string>();

    const identifierPaths: NodePath<t.Identifier>[] = [];

    // Traverse function to identify variables to be replaced with flat object properties
    fnPath.traverse({
      Identifier: {
        exit(identifierPath) {
          if (
            !identifierPath.isBindingIdentifier() &&
            !(identifierPath as NodePath).isReferencedIdentifier()
          )
            return;

          if ((identifierPath.node as NodeSymbol)[UNSAFE]) return;
          const identifierName = identifierPath.node.name;

          if (
            t.isFunctionDeclaration(identifierPath.parent) &&
            identifierPath.parent.id === identifierPath.node
          )
            return;
          if (identifierName === "arguments") return;

          var binding = identifierPath.scope.getBinding(identifierName);
          if (!binding) {
            return;
          }

          if (
            binding.kind === "param" &&
            binding.identifier === identifierPath.node
          )
            return;

          var definedLocal = identifierPath.scope;
          do {
            if (definedLocal.hasOwnBinding(identifierName)) return;
            if (definedLocal === fnPath.scope) break;

            definedLocal = definedLocal.parent;
            if (definedLocal === program.scope) ok(false);
          } while (definedLocal);

          var cursor: Scope = fnPath.scope.parent;
          var isOutsideVariable = false;

          do {
            if (cursor.hasBinding(identifierName)) {
              isOutsideVariable = true;
              break;
            }
            cursor = cursor.parent;
          } while (cursor);

          if (!isOutsideVariable) {
            return;
          }

          identifierPaths.push(identifierPath);
        },
      },
    });

    me.log(
      `Function ${functionName}`,
      "requires",
      Array.from(new Set(identifierPaths.map((x) => x.node.name)))
    );

    for (var identifierPath of identifierPaths) {
      const identifierName = identifierPath.node.name;
      if (typeof identifierName !== "string") continue;

      const isTypeof = identifierPath.parentPath.isUnaryExpression({
        operator: "typeof",
      });
      const isFunctionCall =
        identifierPath.parentPath.isCallExpression() &&
        identifierPath.parentPath.node.callee === identifierPath.node;

      if (isTypeof) {
        var typeofProp = typeofProps.get(identifierName);
        if (!typeofProp) {
          typeofProp = generateProp(identifierName);
          typeofProps.set(identifierName, typeofProp);
        }

        identifierPath.parentPath
          .replaceWith(
            t.memberExpression(
              t.identifier(flatObjectName),
              t.stringLiteral(typeofProp),
              true
            )
          )[0]
          .skip();
        return;
      } else if (isFunctionCall) {
        let functionCallProp = functionCallProps.get(identifierName);
        if (!functionCallProp) {
          functionCallProp = generateProp(identifierName);
          functionCallProps.set(identifierName, functionCallProp);
        }

        // Replace identifier with a reference to the flat object property
        identifierPath
          .replaceWith(
            t.memberExpression(
              t.identifier(flatObjectName),
              t.stringLiteral(functionCallProp),
              true
            )
          )[0]
          .skip();
      } else {
        let standardProp = standardProps.get(identifierName);
        if (!standardProp) {
          standardProp = generateProp(identifierName);
          standardProps.set(identifierName, standardProp);
        }

        ensureComputedExpression(identifierPath);

        // Replace identifier with a reference to the flat object property
        identifierPath
          .replaceWith(
            t.memberExpression(
              t.identifier(flatObjectName),
              t.stringLiteral(standardProp),
              true
            )
          )[0]
          .skip();
      }
    }

    // for (const prop of [...typeofProps.keys(), ...functionCallProps.keys()]) {
    //   if (!standardProps.has(prop)) {
    //     standardProps.set(prop, generateProp());
    //   }
    // }

    const flatObjectProperties: t.ObjectMember[] = [];

    for (var entry of standardProps) {
      const [identifierName, objectProp] = entry;

      flatObjectProperties.push(
        skipNode(
          t.objectMethod(
            "get",
            t.stringLiteral(objectProp),
            [],
            t.blockStatement([t.returnStatement(t.identifier(identifierName))]),
            false,
            false,
            false
          )
        )
      );

      var valueArgName = me.getPlaceholder() + "_value";
      flatObjectProperties.push(
        skipNode(
          t.objectMethod(
            "set",
            t.stringLiteral(objectProp),
            [t.identifier(valueArgName)],
            t.blockStatement([
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.identifier(identifierName),
                  t.identifier(valueArgName)
                )
              ),
            ]),
            false,
            false,
            false
          )
        )
      );
    }

    for (const entry of typeofProps) {
      const [identifierName, objectProp] = entry;

      flatObjectProperties.push(
        skipNode(
          t.objectMethod(
            "get",
            t.stringLiteral(objectProp),
            [],
            t.blockStatement([
              t.returnStatement(
                t.unaryExpression("typeof", t.identifier(identifierName))
              ),
            ]),
            false,
            false,
            false
          )
        )
      );
    }

    for (const entry of functionCallProps) {
      const [identifierName, objectProp] = entry;

      flatObjectProperties.push(
        skipNode(
          t.objectMethod(
            "method",
            t.stringLiteral(objectProp),
            [t.restElement(t.identifier("args"))],
            t.blockStatement([
              t.returnStatement(
                t.callExpression(t.identifier(identifierName), [
                  t.spreadElement(t.identifier("args")),
                ])
              ),
            ]),
            false,
            false,
            false
          )
        )
      );
    }

    // Create the new flattened function
    const flattenedFunctionDeclaration = t.functionDeclaration(
      t.identifier(newFnName),
      [t.arrayPattern([...fnPath.node.params]), t.identifier(flatObjectName)],
      t.blockStatement([...[...fnPath.node.body.body]]),
      false,
      fnPath.node.async
    );

    // Create the flat object variable declaration
    const flatObjectDeclaration = t.variableDeclaration("var", [
      t.variableDeclarator(
        t.identifier(flatObjectName),
        t.objectExpression(flatObjectProperties)
      ),
    ]);

    var argName = me.getPlaceholder() + "_args";

    // Replace original function body with a call to the flattened function
    fnPath.node.body = t.blockStatement([
      flatObjectDeclaration,
      t.returnStatement(
        t.callExpression(t.identifier(newFnName), [
          t.identifier(argName),
          t.identifier(flatObjectName),
        ])
      ),
    ]);

    const originalLength = computeFunctionLength(fnPath);
    fnPath.node.params = [t.restElement(t.identifier(argName))];

    // Ensure updated parameter gets registered in the function scope
    fnPath.scope.crawl();
    fnPath.skip();

    // Add the new flattened function at the top level
    var newPath = prepend(program, flattenedFunctionDeclaration)[0];

    me.skip(newPath);

    // Ensure parameters are registered in the new function scope
    newPath.scope.crawl();

    newPath.skip();

    // Set function length
    me.setFunctionLength(fnPath, originalLength);
  }

  return {
    visitor: {
      Function: {
        exit(path: NodePath<t.Function>) {
          flattenFunction(path);
        },
      },
    },
  };
};
