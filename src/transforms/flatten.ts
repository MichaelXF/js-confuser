import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";
import {
  ensureComputedExpression,
  getFunctionName,
  isDefiningIdentifier,
  isModifiedIdentifier,
  isStrictMode,
  isVariableIdentifier,
  prepend,
  prependProgram,
} from "../utils/ast-utils";
import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";
import { NodeSymbol, PREDICTABLE, UNSAFE } from "../constants";
import {
  computeFunctionLength,
  isVariableFunctionIdentifier,
} from "../utils/function-utils";
import { NameGen } from "../utils/NameGen";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Flatten, {
    changeData: {
      functions: 0,
    },
  });
  const isDebug = false;

  function flattenFunction(fnPath: NodePath<t.Function>) {
    // Skip if already processed
    if (me.isSkipped(fnPath)) return;

    // Don't apply to generator functions
    if (fnPath.node.generator) return;

    // Skip getter/setter methods
    if (fnPath.isObjectMethod() || fnPath.isClassMethod()) {
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

    if (!me.computeProbabilityMap(me.options.flatten, functionName)) {
      return;
    }

    const strictMode = fnPath.find((path) => isStrictMode(path));
    if (strictMode === fnPath) return;

    me.log("Transforming", functionName);

    const flatObjectName = `${me.getPlaceholder()}_flat_object`;
    const newFnName = `${me.getPlaceholder()}_flat_${functionName}`;

    const nameGen = new NameGen(me.options.identifierGenerator);

    function generateProp(originalName: string, type: string) {
      var newPropertyName: string;
      do {
        newPropertyName = isDebug
          ? type + "_" + originalName
          : nameGen.generate();
      } while (allPropertyNames.has(newPropertyName));

      allPropertyNames.add(newPropertyName);

      return newPropertyName;
    }

    const standardProps = new Map<string, string>();
    const setterPropsNeeded = new Set<string>();
    const typeofProps = new Map<string, string>();
    const functionCallProps = new Map<string, string>();
    const allPropertyNames = new Set();

    const identifierPaths: NodePath<t.Identifier>[] = [];

    // Traverse function to identify variables to be replaced with flat object properties
    fnPath.traverse({
      Identifier: {
        exit(identifierPath) {
          if (!isVariableIdentifier(identifierPath)) return;

          if (
            identifierPath.isBindingIdentifier() &&
            isDefiningIdentifier(identifierPath)
          )
            return;

          if (isVariableFunctionIdentifier(identifierPath)) return;

          if ((identifierPath.node as NodeSymbol)[UNSAFE]) return;
          const identifierName = identifierPath.node.name;

          if (identifierName === "arguments") return;

          var binding = identifierPath.scope.getBinding(identifierName);
          if (!binding) {
            return;
          }

          var isOutsideVariable =
            fnPath.scope.parent.getBinding(identifierName) === binding;

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
          typeofProp = generateProp(identifierName, "typeof");
          typeofProps.set(identifierName, typeofProp);
        }

        ensureComputedExpression(identifierPath.parentPath);

        identifierPath.parentPath
          .replaceWith(
            t.memberExpression(
              t.identifier(flatObjectName),
              t.stringLiteral(typeofProp),
              true
            )
          )[0]
          .skip();
      } else if (isFunctionCall) {
        let functionCallProp = functionCallProps.get(identifierName);
        if (!functionCallProp) {
          functionCallProp = generateProp(identifierName, "call");
          functionCallProps.set(identifierName, functionCallProp);
        }

        ensureComputedExpression(identifierPath);

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
          standardProp = generateProp(identifierName, "standard");
          standardProps.set(identifierName, standardProp);
        }

        if (!setterPropsNeeded.has(identifierName)) {
          // Only provide 'set' method if the variable is modified
          var isModification = isModifiedIdentifier(identifierPath);

          if (isModification) {
            setterPropsNeeded.add(identifierName);
          }
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
        me.skip(
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

      // Not all properties need a setter
      if (setterPropsNeeded.has(identifierName)) {
        var valueArgName = me.getPlaceholder() + "_value";
        flatObjectProperties.push(
          me.skip(
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
    }

    for (const entry of typeofProps) {
      const [identifierName, objectProp] = entry;

      flatObjectProperties.push(
        me.skip(
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
        me.skip(
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
    var newPath = prependProgram(
      program,
      flattenedFunctionDeclaration
    )[0] as NodePath<t.FunctionDeclaration>;

    me.skip(newPath);

    // Copy over all properties except the predictable flag
    for (var symbol of Object.getOwnPropertySymbols(fnPath.node)) {
      if (symbol !== PREDICTABLE) {
        newPath.node[symbol] = fnPath.node[symbol];
      }
    }

    // Old function is no longer predictable (rest element parameter)
    (fnPath.node as NodeSymbol)[PREDICTABLE] = false;
    // Old function is unsafe (uses arguments, this)
    (fnPath.node as NodeSymbol)[UNSAFE] = true;

    newPath.node[PREDICTABLE] = true;

    // Carry over 'use strict' directive if not already present
    if (strictMode) {
      newPath.node.body.directives.push(
        t.directive(t.directiveLiteral("use strict"))
      );

      // Non-simple parameter list conversion
      prepend(
        newPath,
        t.variableDeclaration("var", [
          t.variableDeclarator(
            t.arrayPattern(newPath.node.params),
            t.identifier("arguments")
          ),
        ])
      );
      newPath.node.params = [];
      // Using 'arguments' is unsafe
      (newPath.node as NodeSymbol)[UNSAFE] = true;
      // Params changed and using 'arguments'
      (newPath.node as NodeSymbol)[PREDICTABLE] = false;
    }

    // Ensure parameters are registered in the new function scope
    newPath.scope.crawl();

    newPath.skip();
    me.skip(newPath);

    // Set function length
    me.setFunctionLength(fnPath, originalLength);

    me.changeData.functions++;
  }

  return {
    visitor: {
      Function: {
        exit(path: NodePath<t.Function>) {
          flattenFunction(path);
        },
      },
      Program(path) {
        path.scope.crawl();
      },
    },
  };
};
