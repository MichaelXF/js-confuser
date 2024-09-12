import { NodePath, PluginObj } from "@babel/core";
import { Binding, Scope } from "@babel/traverse";
import { PluginArg } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";
import {
  NodeSymbol,
  noRenameVariablePrefix,
  placeholderVariablePrefix,
  variableFunctionName,
  NO_RENAME,
} from "../../constants";
import { computeProbabilityMap } from "../../probability";
import {
  getParentFunctionOrProgram,
  isDefiningIdentifier,
} from "../../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.RenameVariables);
  let availableNames: string[] = [];

  let renamedScopes = new Set<Scope>();
  let renamedBindingIdentifiers = new WeakSet<t.Identifier>();

  let changedScopes = new Map<Scope, Map<string, string>>();

  return {
    visitor: {
      Program: {
        enter(path) {
          path.scope.crawl();

          availableNames = Array.from(me.obfuscator.nameGen.generatedNames);
        },
      },
      CallExpression: {
        exit(path: NodePath<t.CallExpression>) {
          if (
            path.get("callee").isIdentifier({
              name: variableFunctionName,
            })
          ) {
            const [arg] = path.get("arguments");
            if (arg.isIdentifier()) {
              path.replaceWith(t.stringLiteral(arg.node.name));
            }
          }
        },
      },

      Scopable: {
        enter(path: NodePath<t.Scopable>) {
          let { scope } = path;
          if (scope.path?.isClassDeclaration()) return;

          if (renamedScopes.has(scope)) {
            return;
          }
          renamedScopes.add(scope);

          var names = [];

          // Collect all referenced identifiers in the current scope
          const referencedIdentifiers = new Set();

          let traversePath: NodePath = path;
          if (path.parentPath?.isForStatement()) {
            traversePath = path.parentPath;
          }

          traversePath.traverse({
            Identifier(innerPath) {
              // Use Babel's built-in method to check if the identifier is a referenced variable
              var type = innerPath.isReferencedIdentifier()
                ? "referenced"
                : (innerPath as NodePath).isBindingIdentifier()
                ? "binding"
                : null;
              if (type) {
                const binding = innerPath.scope.getBinding(innerPath.node.name);

                if (type === "binding" && isDefiningIdentifier(innerPath)) {
                  /**
                   * var a; // Program bindings = {a}
                   * { // Block Statement bindings = {}
                   *    var a;
                   * }
                   *
                   * Add variable binding to 'a'
                   */

                  if (
                    binding &&
                    binding.kind === "var" &&
                    binding.scope !== scope
                  ) {
                  } else {
                    return;
                  }
                }

                // If the binding exists and is not defined in the current scope, it is a reference
                if (binding && binding.scope !== path.scope) {
                  referencedIdentifiers.add(innerPath.node.name);
                }
              }
            },
          });

          // console.log(scope.path.type, "Referenced", referencedIdentifiers);

          var preprocessedMappings = new Map<Binding, string>();

          for (let identifierName in scope.bindings) {
            const binding = scope.bindings[identifierName];
            if (binding.kind === "hoisted" || binding.kind === "var") {
              // Check if already renamed - check function context
              var functionContext = getParentFunctionOrProgram(binding.path);

              const alreadyRenamed = changedScopes
                .get(functionContext.scope)
                ?.get(identifierName);

              // console.log(
              //   scope.path.type,
              //   "Checking already renamed",
              //   identifierName,
              //   alreadyRenamed
              // );

              if (alreadyRenamed) {
                const fnBinding =
                  functionContext.scope.getOwnBinding(alreadyRenamed);
                if (
                  fnBinding &&
                  renamedBindingIdentifiers.has(fnBinding.identifier)
                ) {
                  preprocessedMappings.set(binding, alreadyRenamed);
                  referencedIdentifiers.add(alreadyRenamed);
                }
              }
            }
          }

          var actuallyAvailableNames = availableNames.filter(
            (x) => !referencedIdentifiers.has(x) && !scope.bindings[x]
          );

          const isGlobal = scope.path.isProgram();

          for (let identifierName in scope.bindings) {
            // __NO_JS_CONFUSER_RENAME__ prefix should not be renamed
            if (identifierName.startsWith(noRenameVariablePrefix)) continue;

            const isPlaceholder = identifierName.startsWith(
              placeholderVariablePrefix
            );

            if (!isPlaceholder) {
              // Global variables should be checked against user's options
              if (isGlobal) {
                if (
                  !computeProbabilityMap(
                    me.options.renameGlobals,
                    (x) => x,
                    identifierName
                  )
                )
                  continue;
              }

              // Allow user to disable renaming certain variables
              if (
                !computeProbabilityMap(
                  me.options.renameVariables,
                  identifierName,
                  isGlobal
                )
              )
                continue;
            }

            const binding = scope.bindings[identifierName];
            if (renamedBindingIdentifiers.has(binding.identifier)) continue;
            renamedBindingIdentifiers.add(binding.identifier);

            if (!binding.path.node || binding.path.node[NO_RENAME]) continue;

            let newName =
              preprocessedMappings.get(binding) ?? actuallyAvailableNames.pop();

            if (!newName) {
              while (!newName || scope.hasGlobal(newName)) {
                newName = me.obfuscator.nameGen.generate();
              }
              names.push(newName);
            }

            if (!changedScopes.has(scope)) {
              changedScopes.set(scope, new Map());
            }
            changedScopes.get(scope).set(identifierName, newName);

            // console.log(scope.path.type, "Renamed", identifierName, newName);

            me.log("Renaming", identifierName, "to", newName);
            scope.rename(identifierName, newName);

            // Extra Class Declaration scope preserve logic needed
            if (binding.path.type === "ClassDeclaration") {
              var newBinding = scope.bindings[newName];
              binding.path.scope.bindings[newName] = newBinding;
            }
          }

          availableNames.push(...names);
        },
      },
    },
  };
};
