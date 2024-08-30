import { PluginObj } from "@babel/core";
import { PluginArg } from "../plugin";
import { Order } from "../../order";
import * as t from "@babel/types";
import { ok } from "assert";

/**
 * Variable Concealing uses the `with` statement to obfuscate variable names.
 */
export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.RenameVariables);

  return {
    visitor: {
      FunctionDeclaration: {
        exit(path) {
          var scopeName = me.getPlaceholder();

          for (var identifierName in path.scope.bindings) {
            const binding = path.scope.bindings[identifierName];
            if (binding.kind === "param") {
              continue;
            }

            // Replace 'var' kind to simply define a property on the scope object
            if (binding.kind === "var") {
              var declaration = binding.path.parentPath;
              ok(
                declaration.isVariableDeclaration(),
                "Expected variable declaration"
              );
              ok(
                declaration.node.declarations.length === 1,
                "Expected single declaration"
              );

              declaration.replaceWith(
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(
                      t.identifier(scopeName),
                      t.identifier(identifierName)
                    ),
                    declaration.node.declarations[0].init
                  )
                )
              );
            }
          }

          path.node.body = t.blockStatement([
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(scopeName),
                t.objectExpression([])
              ),
            ]),
            t.withStatement(
              t.identifier(scopeName),
              t.blockStatement(path.node.body.body)
            ),
          ]);
        },
      },
    },
  };
};
