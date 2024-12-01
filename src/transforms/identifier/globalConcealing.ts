import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";
import { NameGen } from "../../utils/NameGen";
import Template from "../../templates/template";
import { PluginArg, PluginObject } from "../plugin";
import { Order } from "../../order";
import {
  MULTI_TRANSFORM,
  reservedIdentifiers,
  reservedNodeModuleIdentifiers,
  variableFunctionName,
} from "../../constants";
import {
  getMemberExpressionPropertyAsString,
  isVariableIdentifier,
  prepend,
} from "../../utils/ast-utils";
import { createGetGlobalTemplate } from "../../templates/getGlobalTemplate";
import {
  getRandomInteger,
  getRandomString,
  shuffle,
} from "../../utils/random-utils";
import { ok } from "assert";

const ignoreGlobals = new Set([
  ...reservedNodeModuleIdentifiers,
  "__dirname",
  "eval",
  "arguments",
  variableFunctionName,
  ...reservedIdentifiers,
]);

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.GlobalConcealing, {
    changeData: {
      globals: 0,
      nativeFunctions: 0,
    },
  });

  var globalMapping = new Map<string, string>(),
    globalFnName = me.getPlaceholder() + "_getGlobal",
    globalVarName = me.getPlaceholder() + "_globalVar",
    gen = new NameGen();

  // Create the getGlobal function using a template
  function createGlobalConcealingFunction(): t.FunctionDeclaration {
    // Create fake global mappings

    var fakeCount = getRandomInteger(20, 40);
    for (var i = 0; i < fakeCount; i++) {
      var fakeName = getRandomString(getRandomInteger(6, 8));
      globalMapping.set(gen.generate(), fakeName);
    }

    const createSwitchStatement = () => {
      const cases = shuffle(Array.from(globalMapping.keys())).map(
        (originalName) => {
          var mappedKey = globalMapping.get(originalName);

          return t.switchCase(t.stringLiteral(mappedKey), [
            t.returnStatement(
              t.memberExpression(
                t.identifier(globalVarName),
                t.stringLiteral(originalName),
                true
              )
            ),
          ]);
        }
      );

      return t.switchStatement(t.identifier("mapping"), cases);
    };

    return t.functionDeclaration(
      t.identifier(globalFnName),
      [t.identifier("mapping")],
      t.blockStatement([createSwitchStatement()])
    );
  }

  return {
    visitor: {
      Program: {
        exit(programPath: NodePath<t.Program>) {
          var illegalGlobals = new Set<string>();
          var pendingReplacements = new Map<string, NodePath[]>();

          programPath.traverse({
            Identifier(identifierPath) {
              if (!isVariableIdentifier(identifierPath)) return;

              var identifierName = identifierPath.node.name;

              if (ignoreGlobals.has(identifierName)) return;

              const binding = identifierPath.scope.getBinding(identifierName);
              if (binding) {
                illegalGlobals.add(identifierName);
                return;
              }

              if (!identifierPath.scope.hasGlobal(identifierName)) {
                return;
              }

              var assignmentChild = identifierPath.find((p) =>
                p.parentPath?.isAssignmentExpression()
              );
              if (
                assignmentChild &&
                t.isAssignmentExpression(assignmentChild.parent) &&
                assignmentChild.parent.left === assignmentChild.node &&
                !t.isMemberExpression(identifierPath.parent)
              ) {
                illegalGlobals.add(identifierName);
                return;
              }

              if (!pendingReplacements.has(identifierName)) {
                pendingReplacements.set(identifierName, [identifierPath]);
              } else {
                pendingReplacements.get(identifierName).push(identifierPath);
              }
            },
          });

          // Remove illegal globals
          illegalGlobals.forEach((globalName) => {
            pendingReplacements.delete(globalName);
          });

          for (var [globalName, paths] of pendingReplacements) {
            var mapping = globalMapping.get(globalName);
            if (!mapping) {
              // Allow user to disable custom global variables
              if (
                !me.computeProbabilityMap(
                  me.options.globalConcealing,
                  globalName
                )
              )
                continue;

              mapping = gen.generate();
              globalMapping.set(globalName, mapping);
            }

            // Replace global reference with getGlobal("name")
            const callExpression = t.callExpression(
              t.identifier(globalFnName),
              [t.stringLiteral(mapping)]
            );

            const { nativeFunctionName } = me.globalState.internals;

            for (let path of paths) {
              const replaceExpression = t.cloneNode(callExpression);
              me.skip(replaceExpression);

              if (
                // Native Function will only be populated if tamper protection is enabled
                nativeFunctionName &&
                // Avoid maximum call stack error
                !path.find((p) => p.node[MULTI_TRANSFORM] || me.isSkipped(p))
              ) {
                // First extract the member expression chain
                let nameAndPropertyPath = [globalName];
                let cursorPath = path;
                let callExpressionPath: NodePath<t.CallExpression> | null =
                  null;

                const checkForCallExpression = () => {
                  if (
                    cursorPath.parentPath?.isCallExpression() &&
                    cursorPath.key === "callee"
                  ) {
                    callExpressionPath = cursorPath.parentPath;
                    return true;
                  }
                };

                if (!checkForCallExpression()) {
                  cursorPath = cursorPath?.parentPath;
                  while (cursorPath?.isMemberExpression()) {
                    let propertyString = getMemberExpressionPropertyAsString(
                      cursorPath.node
                    );
                    if (!propertyString || typeof propertyString !== "string") {
                      break;
                    }

                    nameAndPropertyPath.push(propertyString);

                    if (checkForCallExpression()) break;
                    cursorPath = cursorPath.parentPath;
                  }
                }

                // Eligible member-expression/identifier
                if (callExpressionPath) {
                  // Check user's custom implementation
                  var shouldTransform =
                    me.obfuscator.shouldTransformNativeFunction(
                      nameAndPropertyPath
                    );
                  if (shouldTransform) {
                    path.replaceWith(replaceExpression);

                    // console.log("Hello World") ->
                    // checkNative(getGlobal("console")["log"])("Hello World")

                    // Parent-most member expression must be wrapped
                    // This to preserve proper 'this' binding in member expression invocations
                    let callee = callExpressionPath.get(
                      "callee"
                    ) as NodePath<t.Expression>;
                    let callArgs: t.Expression[] = [callee.node];

                    if (callee.isMemberExpression()) {
                      const additionalPropertyString =
                        getMemberExpressionPropertyAsString(callee.node);
                      ok(
                        additionalPropertyString,
                        "Expected additional property to be a string"
                      );
                      callee = callee.get("object");
                      callArgs = [
                        callee.node,
                        t.stringLiteral(additionalPropertyString),
                      ];
                    }

                    // Method supports two signatures:
                    // checkNative(fetch)(...)
                    // checkNative(console, "log")(...)

                    callExpressionPath
                      .get("callee")
                      .replaceWith(
                        me.skip(
                          t.callExpression(
                            t.identifier(nativeFunctionName),
                            callArgs
                          )
                        )
                      );

                    me.changeData.nativeFunctions++;
                    continue;
                  }
                }
              }

              me.changeData.globals++;

              // Regular replacement
              // console -> getGlobal("console")
              path.replaceWith(replaceExpression);
            }
          }

          // No globals changed, no need to insert the getGlobal function
          if (globalMapping.size === 0) return;

          // The Global Concealing function returns the global variable from the specified parameter
          const globalConcealingFunction = createGlobalConcealingFunction();

          prepend(programPath, globalConcealingFunction);

          const getGlobalVarFnName = me.getPlaceholder() + "_getGlobalVarFn";

          // Insert the get global function
          prepend(
            programPath,
            createGetGlobalTemplate(me, programPath).compile({
              getGlobalFnName: getGlobalVarFnName,
            })
          );

          // Call the get global function and store result in 'globalVarName'
          prepend(
            programPath,
            new Template(
              `var ${globalVarName} = ${getGlobalVarFnName}()`
            ).single<t.Statement>()
          );
        },
      },
    },
  };
};
