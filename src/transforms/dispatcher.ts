import { PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import Template from "../templates/template";
import { ok } from "assert";
import { chance, getRandomString } from "../utils/random-utils";
import { computeProbabilityMap } from "../probability";
import { Order } from "../order";
import { NodeSymbol, UNSAFE } from "../constants";
import { isVariableFunctionIdentifier } from "../utils/function-utils";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Dispatcher);
  var dispatcherCounter = 0;

  return {
    visitor: {
      "Program|Function": {
        exit(_path) {
          const blockPath = _path as NodePath<t.Program | t.Function>;

          if ((blockPath.node as NodeSymbol)[UNSAFE]) return;

          // For testing
          // if (!blockPath.isProgram()) return;

          var blockStatement: NodePath<t.Block> = blockPath.isProgram()
            ? blockPath
            : (blockPath.get("body") as NodePath<t.BlockStatement>);

          // Track functions and illegal ones
          // A function is illegal if:
          // - the function is async or generator
          // - the function is redefined
          // - the function uses 'this', 'eval', or 'arguments'
          var functionPaths = new Map<
            string,
            NodePath<t.FunctionDeclaration>
          >();
          var illegalNames = new Set<string>();

          // Scan for function declarations
          blockPath.traverse({
            FunctionDeclaration: {
              exit(path: NodePath<t.FunctionDeclaration>) {
                const name = path.node.id.name;
                // If the function is not named, we can't dispatch it
                if (!name) {
                  return;
                }

                // Do not apply to async or generator functions
                if (path.node.async || path.node.generator) {
                  return;
                }

                // Do not apply to functions in nested scopes
                if (path.parentPath !== blockStatement) {
                  illegalNames.add(name);
                  return;
                }

                if (
                  functionPaths.has(name) ||
                  (path.node as NodeSymbol)[UNSAFE]
                ) {
                  illegalNames.add(name);
                  return;
                }

                if (
                  path.node.params.find(
                    (x) => x.type === "AssignmentPattern"
                  ) ||
                  (path.node as NodeSymbol)[UNSAFE]
                ) {
                  illegalNames.add(name);
                  return;
                }

                functionPaths.set(name, path);
              },
            },
          });

          for (let name of illegalNames) {
            functionPaths.delete(name);
          }

          for (var name of functionPaths.keys()) {
            if (!computeProbabilityMap(me.options.dispatcher, name)) {
              functionPaths.delete(name);
            }
          }

          // No functions here to change
          if (functionPaths.size === 0) {
            return;
          }

          const dispatcherName =
            me.getPlaceholder() + "_dispatcher_" + dispatcherCounter++;
          const payloadName = me.getPlaceholder() + "_payload";
          const cacheName = me.getPlaceholder() + "_cache";
          const newNameMapping = new Map<string, string>();

          const keys = {
            placeholderNoMeaning: getRandomString(10),
            clearPayload: getRandomString(10),
            nonCall: getRandomString(10),
            returnAsObject: getRandomString(10),
            returnAsObjectProperty: getRandomString(10),
          };

          for (var name of functionPaths.keys()) {
            newNameMapping.set(name, getRandomString(6) /**  "_" + name */);
          }

          // Find identifiers calling/referencing the functions
          blockPath.traverse({
            ReferencedIdentifier: {
              exit(path: NodePath<t.Identifier | t.JSXIdentifier>) {
                if (path.isJSX()) return;
                if (isVariableFunctionIdentifier(path)) return;
                const name = path.node.name;

                var fnPath = functionPaths.get(name);
                if (!fnPath) return;

                var newName = newNameMapping.get(name);

                // Do not replace if not referencing the actual function
                if (path.scope.getBinding(name).path !== fnPath) {
                  return;
                }

                const createDispatcherCall = (name, flagArg?) => {
                  var dispatcherArgs = [t.stringLiteral(name)];
                  if (flagArg) {
                    dispatcherArgs.push(t.stringLiteral(flagArg));
                  }

                  var asObject = chance(50);

                  if (asObject) {
                    if (dispatcherArgs.length < 2) {
                      dispatcherArgs.push(
                        t.stringLiteral(keys.placeholderNoMeaning)
                      );
                    }
                    dispatcherArgs.push(t.stringLiteral(keys.returnAsObject));
                  }

                  var callExpression = t.callExpression(
                    t.identifier(dispatcherName),
                    dispatcherArgs
                  );

                  if (!asObject) {
                    return callExpression;
                  }

                  return t.memberExpression(
                    callExpression,
                    t.stringLiteral(keys.returnAsObjectProperty),
                    true
                  );
                };

                // Replace the identifier with a call to the function
                if (path.parent.type === "CallExpression") {
                  var expressions: t.Expression[] = [];
                  var callArguments = path.parent.arguments;

                  if (callArguments.length === 0) {
                    expressions.push(
                      // Call the function
                      createDispatcherCall(newName, keys.clearPayload)
                    );
                  } else {
                    expressions.push(
                      // Prepare the payload arguments
                      t.assignmentExpression(
                        "=",
                        t.identifier(payloadName),
                        t.arrayExpression(callArguments as t.Expression[])
                      ),

                      // Call the function
                      createDispatcherCall(newName)
                    );
                  }

                  const output =
                    expressions.length === 1
                      ? expressions[0]
                      : t.sequenceExpression(expressions);

                  path.parentPath.replaceWith(output);
                } else {
                  // Replace non-invocation references with a 'cached' version of the function
                  path.replaceWith(createDispatcherCall(newName, keys.nonCall));
                }
              },
            },
          });

          // Create the dispatcher function
          const objectExpression = t.objectExpression(
            Array.from(newNameMapping).map(([name, newName]) => {
              const originalFn = functionPaths.get(name)!.node;

              const newBody = [...originalFn.body.body];
              ok(Array.isArray(newBody));

              newBody.unshift(
                t.variableDeclaration("var", [
                  t.variableDeclarator(
                    t.arrayPattern([...originalFn.params]),
                    t.identifier(payloadName)
                  ),
                ])
              );

              const functionExpression = t.functionExpression(
                null,
                [],
                t.blockStatement(newBody)
              );

              return t.objectProperty(
                t.stringLiteral(newName),

                functionExpression
              );
            })
          );

          const dispatcher = new Template(`
            function ${dispatcherName}(name, flagArg, returnTypeArg) {
              var output, fns = {objectExpression};

              if(flagArg === "${keys.clearPayload}") {
                ${payloadName} = [];
              }
              if(flagArg === "${keys.nonCall}") {
                output = ${cacheName}[name] || (${cacheName}[name] = function(...args){ 
                ${payloadName} = args;
                return fns[name].apply(this);
              });
              } else {
                output = fns[name]();
              }

              if(returnTypeArg === "${keys.returnAsObject}") {
                return { "${keys.returnAsObjectProperty}": output };
              } else {
                return output;
              }
            }
            `).single({
            objectExpression,
          });

          /**
           * Prepends the node into the block. (And registers the declaration)
           * @param node
           */
          function prepend(node: t.Statement) {
            var p = blockStatement.unshiftContainer<any, any, any>(
              "body",
              node
            );
            blockStatement.scope.registerDeclaration(p[0]);
          }

          // Insert the dispatcher function
          prepend(dispatcher);

          // Insert the payload variable
          prepend(
            t.variableDeclaration("var", [
              t.variableDeclarator(t.identifier(payloadName)),
            ])
          );

          // Insert the cache variable
          prepend(
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(cacheName),
                new Template(`Object["create"](null)`).expression()
              ),
            ])
          );

          // Remove original functions
          for (let path of functionPaths.values()) {
            path.remove();
          }
        },
      },
    },
  };
};
