import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import { NameGen } from "../../utils/NameGen";
import Template from "../../templates/template";
import { PluginArg } from "../plugin";
import { Order } from "../../order";
import { computeProbabilityMap } from "../../probability";
import { variableFunctionName } from "../../constants";

const ignoreGlobals = new Set([
  "require",
  "__dirname",
  "eval",
  variableFunctionName,
]);

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.GlobalConcealing);

  var globalMapping = new Map<string, string>(),
    globalFnName = me.getPlaceholder() + "_getGlobal",
    globalVarName = me.getPlaceholder() + "_globalVar",
    gen = new NameGen();

  // Create the getGlobal function using a template
  function createGetGlobalFunction(): t.FunctionDeclaration {
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
                assignmentChild.parentPath.isAssignmentExpression() &&
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

          // Insert the getGlobal function at the top of the program body
          const getGlobalFunction = createGetGlobalFunction();

          var newPath = programPath.unshiftContainer(
            "body",
            getGlobalFunction
          )[0];
          programPath.scope.registerDeclaration(newPath);

          var varPath = programPath.unshiftContainer(
            "body",
            new Template(`
            var {globalVarName} = (function (){
              try {
                return window;
              } catch ( e ) {
              }
              try {
                return global;
              } catch ( e ) {
              }

              return this;
          })();

            `).compile({ globalVarName: globalVarName })
          )[0];

          programPath.scope.registerDeclaration(varPath);
        },
      },
    },
  };
};
