import { NodePath } from "@babel/traverse";
import { Visitor } from "@babel/traverse";
import { PluginArg, PluginObject } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";
import {
  noRenameVariablePrefix,
  placeholderVariablePrefix,
} from "../../constants";
import {
  getParentFunctionOrProgram,
  isDefiningIdentifier,
  isExportedIdentifier,
  isVariableIdentifier,
} from "../../utils/ast-utils";
import { isVariableFunctionIdentifier } from "../../utils/function-utils";

const RENAMED = Symbol("Renamed");

const reusePreviousNames = true;

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.RenameVariables, {
    changeData: {
      variables: 0,
    },
  });

  const definedMap = new Map<t.Node, Set<string>>();
  const referencedMap = new Map<t.Node, Set<string>>();
  const paramMap = new Map<t.Node, Set<string>>(); // Used for default function parameter special case
  const bindingMap = new Map<t.Node, Map<string, NodePath<t.Identifier>>>();

  const renamedVariables = new Map<t.Node, Map<string, string>>();
  me.obfuscator.globalState.renamedVariables = renamedVariables;

  const generated = Array.from(me.obfuscator.nameGen.generatedNames);

  const VariableAnalysisVisitor: Visitor = {
    Program: {
      enter(path) {
        // Analyze all scopes
        path.traverse({
          Identifier(path) {
            if (!isVariableIdentifier(path)) return;

            let contextPaths: NodePath<t.Node>[] = [
              getParentFunctionOrProgram(path),
            ];

            let isDefined = false;
            let isParameter = false;

            if (path.isBindingIdentifier() && isDefiningIdentifier(path)) {
              isDefined = true;
              const binding = path.scope.getBinding(path.node.name);
              if (binding?.kind === "param") isParameter = true;

              // Function ID is defined in the parent's function declaration
              if (
                path.key === "id" &&
                path.parentPath.isFunctionDeclaration()
              ) {
                contextPaths = [getParentFunctionOrProgram(path.parentPath)];
              }
            }

            contextPaths.forEach((contextPath) => {
              // console.log(contextPath.node.type, path.node.name, isDefined);

              if (isDefined) {
                // Add to defined map
                if (!definedMap.has(contextPath.node)) {
                  definedMap.set(contextPath.node, new Set());
                }
                definedMap.get(contextPath.node).add(path.node.name);

                if (!bindingMap.has(contextPath.node)) {
                  bindingMap.set(contextPath.node, new Map());
                }
                bindingMap.get(contextPath.node).set(path.node.name, path);
              } else {
                // Add to reference map
                if (!referencedMap.has(contextPath.node)) {
                  referencedMap.set(contextPath.node, new Set());
                }
                referencedMap.get(contextPath.node).add(path.node.name);
              }
            });
          },
        });

        //
      },
    },
  };

  const VariableRenamingVisitor: Visitor = {
    Identifier(identifierPath) {
      if (!isVariableIdentifier(identifierPath)) return;
      const node = identifierPath.node;
      const identifierName = node.name;

      if (node[RENAMED]) {
        return;
      }

      var contextPaths: NodePath[] = identifierPath.getAncestry();

      // A Function ID is not in the same context as it's body
      if (
        identifierPath.key === "id" &&
        identifierPath.parentPath.isFunctionDeclaration()
      ) {
        contextPaths = contextPaths.filter(
          (x) => x !== identifierPath.parentPath
        );
      }

      var newName = null;

      const skippedPaths = new Set();

      for (let contextPath of contextPaths) {
        if (skippedPaths.has(contextPath)) continue;

        if (contextPath.isFunction()) {
          var assignmentPattern = contextPath.find(
            (p) => p.listKey === "params" && p.parentPath.isFunction()
          );

          if (assignmentPattern?.isAssignmentPattern()) {
            var functionPath = assignmentPattern.getFunctionParent();

            if (functionPath) {
              // The parameters can be still accessed...
              const params = paramMap.get(functionPath.node);
              if (params?.has(identifierName)) {
              } else {
                skippedPaths.add(functionPath);
              }
            }
          }
        }

        const { node } = contextPath;

        const defined = definedMap.get(node);
        if (defined?.has(identifierName)) {
          const renamed = renamedVariables.get(node);
          if (renamed?.has(identifierName)) {
            newName = renamed.get(identifierName);
            break;
          }
        }
      }

      if (newName && typeof newName === "string") {
        // __JS_CONFUSER_VAR__ function
        if (isVariableFunctionIdentifier(identifierPath)) {
          identifierPath.parentPath.replaceWith(t.stringLiteral(newName));
          return;
        }

        // 5. Update Identifier node's 'name' property
        node.name = newName;
        node[RENAMED] = true;

        // 6. Additional parameter mapping
        const binding = identifierPath.scope.getBinding(identifierName);
        if (binding?.kind === "param") {
          var mapNode = binding.scope.path.node;
          if (!paramMap.has(mapNode)) {
            paramMap.set(mapNode, new Set([identifierName]));
          } else {
            paramMap.get(mapNode).add(identifierName);
          }
        }
      }
    },

    Scopable(scopePath: NodePath<t.Scopable>) {
      // 2. Notice this is on 'onEnter' (top-down)
      const isGlobal = scopePath.isProgram();
      const { node } = scopePath.scope.path;
      if (renamedVariables.has(node)) return;

      const defined = definedMap.get(node) || new Set();
      const references = referencedMap.get(node) || new Set();
      const bindings = bindingMap.get(node);

      // No changes needed here
      if (!defined && !renamedVariables.has(node)) {
        renamedVariables.set(node, Object.create(null));
        return;
      }

      const newNames = new Map<string, string>();

      // Names possible to be re-used here
      var possible = new Set<string>();

      // 3. Try to re-use names when possible
      if (reusePreviousNames && generated.length && !isGlobal) {
        var allReferences = new Set<string>();
        var nope = new Set(defined);

        scopePath.traverse({
          Scopable(path) {
            const { node } = path.scope.path;

            var ref = referencedMap.get(node);
            if (ref) {
              ref.forEach((x) => allReferences.add(x));
            }

            var def = definedMap.get(node);
            if (def) {
              def.forEach((x) => allReferences.add(x));
            }
          },
        });

        var passed = new Set<string>();

        const parentPaths = scopePath.getAncestry();
        parentPaths.forEach((p) => {
          if (p === scopePath) return;

          let changes = renamedVariables.get(p.node);
          if (changes) {
            for (let [oldName, newName] of changes) {
              if (!allReferences.has(oldName) && !references.has(oldName)) {
                passed.add(newName);
              } else {
                nope.add(newName);
              }
            }
          }
        });

        nope.forEach((x) => passed.delete(x));

        possible = passed;
      }

      function shouldRename(name: string) {
        // __NO_JS_CONFUSER_RENAME__
        if (name.startsWith(noRenameVariablePrefix)) return false;

        // Placeholder variables should always be renamed
        if (name.startsWith(placeholderVariablePrefix)) return true;

        const binding = bindings?.get(name);

        if (binding) {
          // Do not rename exports
          if (isExportedIdentifier(binding)) return false;
        }

        if (name === me.obfuscator.getStringCompressionLibraryName())
          return false;

        // Global variables are additionally checked against user option
        if (isGlobal) {
          if (!me.computeProbabilityMap(me.options.renameGlobals, name))
            return false;
        }

        if (
          !me.computeProbabilityMap(me.options.renameVariables, name, isGlobal)
        )
          return false;

        return true;
      }

      // 4. Defined names to new names
      for (var name of defined) {
        let newName = name;

        if (shouldRename(name)) {
          me.changeData.variables++;

          // Create a new name from (1) or (2) methods
          do {
            if (possible.size) {
              // (1) Re-use previously generated name
              var first = possible.values().next().value;
              possible.delete(first);
              newName = first;
            } else {
              // (2) Create a new name with global `nameGen`
              var generatedName = me.obfuscator.nameGen.generate();

              newName = generatedName;
              generated.push(generatedName);
            }
          } while (
            scopePath.scope.hasGlobal(newName) ||
            me.obfuscator.nameGen.notSafeForReuseNames.has(newName)
          );
          // Ensure global names aren't overridden
        }

        newNames.set(name, newName);
      }

      // console.log(node.type, newNames);
      renamedVariables.set(node, newNames);
    },
  };

  return {
    visitor: {
      ...VariableAnalysisVisitor,

      ...VariableRenamingVisitor,
    },
  };
};
