import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import { NameGen } from "../../utils/NameGen";
import Template from "../../templates/template";
import { PluginArg } from "../plugin";
import { Order } from "../../order";
import { computeProbabilityMap } from "../../probability";
import { variableFunctionName } from "../../constants";
import { prepend } from "../../utils/ast-utils";
import { createGetGlobalTemplate } from "../../templates/getGlobalTemplate";

const ignoreGlobals = new Set([
  "require",
  "__dirname",
  "eval",
  "arguments",
  variableFunctionName,
]);

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.GlobalConcealing);

  var globalMapping = new Map<string, string>(),
    globalFnName = me.getPlaceholder() + "_getGlobal",
    globalVarName = me.getPlaceholder() + "_globalVar",
    gen = new NameGen();

  // Create the getGlobal function using a template
  function createGlobalConcealingFunction(): t.FunctionDeclaration {
    const createSwitchStatement = () => {
      const cases = Array.from(globalMapping.keys()).map((originalName) => {
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
      });

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
            "ReferencedIdentifier|BindingIdentifier"(_path) {
              var identifierPath = _path as NodePath<t.Identifier>;
              var identifierName = identifierPath.node.name;

              if (
                !identifierPath.scope.hasGlobal(identifierName) ||
                identifierPath.scope.hasOwnBinding(identifierName)
              ) {
                return;
              }

              var assignmentChild = identifierPath.find((p) =>
                p.parentPath?.isAssignmentExpression()
              );
              if (
                assignmentChild &&
                t.isAssignmentExpression(assignmentChild.parent) &&
                assignmentChild.parent.left === assignmentChild.node
              ) {
                illegalGlobals.add(identifierName);
                return;
              }

              if (ignoreGlobals.has(identifierName)) return;

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
                !computeProbabilityMap(me.options.globalConcealing, globalName)
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

            paths.forEach((path) => {
              path.replaceWith(t.cloneNode(callExpression));
            });
          }

          // No globals changed, no need to insert the getGlobal function
          if (globalMapping.size === 0) return;

          // The Global Concealing function returns the global variable from the specified parameter
          const globalConcealingFunction = createGlobalConcealingFunction();

          prepend(programPath, globalConcealingFunction);

          const getGlobalVarFnName = me.getPlaceholder();

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
