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
          // Insert the getGlobal function at the top of the program body
          const getGlobalFunction = createGetGlobalFunction();

          var p = programPath.unshiftContainer("body", getGlobalFunction);
          var p2 = programPath.unshiftContainer(
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
          );

          // Skip transformation for the inserted getGlobal function
          programPath.get("body")[0].stop();
          programPath.get("body")[1].stop();
        },
      },
      ReferencedIdentifier(path: NodePath<t.Identifier | t.JSXIdentifier>) {
        var identifierName = path.node.name;

        if (ignoreGlobals.has(identifierName)) return;

        if (
          !path.scope.hasGlobal(identifierName) ||
          path.scope.hasOwnBinding(identifierName)
        ) {
          return;
        }
        var mapping = globalMapping.get(identifierName);
        if (!mapping) {
          // Allow user to disable custom global variables
          if (
            !computeProbabilityMap(
              me.options.globalConcealing,
              (x) => x,
              identifierName
            )
          )
            return;

          mapping = gen.generate();
          globalMapping.set(identifierName, mapping);
        }

        // Replace global reference with getGlobal("name")
        const callExpression = t.callExpression(t.identifier(globalFnName), [
          t.stringLiteral(mapping),
        ]);

        path.replaceWith(callExpression);
        path.skip();
      },
    },
  };
};
