import { NodePath, PluginObj } from "@babel/core";
import { Binding, Scope } from "@babel/traverse";
import { PluginArg } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";
import {
  noRenameVariablePrefix,
  placeholderVariablePrefix,
  variableFunctionName,
} from "../../constants";
import { computeProbabilityMap } from "../../probability";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.RenameVariables);
  let availableNames: string[] = [];

  let renamedScopes = new Set<Scope>();
  let renamedBindingIdentifiers = new WeakSet<t.Identifier>();

  return {
    visitor: {
      Program: {
        enter(path) {
          path.scope.crawl();
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
          const { scope } = path;
          if (scope.path?.isClassDeclaration()) return;

          if (renamedScopes.has(scope)) {
            return;
          }
          renamedScopes.add(scope);

          var names = [];

          // Collect all referenced identifiers in the current scope
          const referencedIdentifiers = new Set();

          path.traverse({
            Identifier(innerPath) {
              // Use Babel's built-in method to check if the identifier is a referenced variable
              if (innerPath.isReferencedIdentifier()) {
                const binding = innerPath.scope.getBinding(innerPath.node.name);

                // If the binding exists and is not defined in the current scope, it is a reference
                if (binding && binding.scope !== path.scope) {
                  referencedIdentifiers.add(innerPath.node.name);
                }
              }
            },
          });

          var actuallyAvailableNames = availableNames.filter(
            (x) => !referencedIdentifiers.has(x) && !scope.bindings[x]
          );

          const isGlobal = scope.path.isProgram();

          for (var identifierName in scope.bindings) {
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

            let newName = actuallyAvailableNames.pop();

            if (!newName) {
              while (!newName || scope.hasGlobal(newName)) {
                newName = me.obfuscator.nameGen.generate();
              }
              names.push(newName);
            }

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
