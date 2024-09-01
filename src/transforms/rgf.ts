import { NodePath, PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { Order } from "../order";
import * as t from "@babel/types";
import Obfuscator from "../obfuscator";
import { computeProbabilityMap } from "../probability";
import { getFunctionName } from "../utils/ast-utils";
import { NodeSymbol, SKIP, UNSAFE } from "../constants";

/**
 * RGF (Runtime-Generated-Function) uses the `new Function("code")` syntax to create executable code from strings.
 *
 * Limitations:
 *
 * 1. Does not apply to async or generator functions
 * 2. Does not apply to functions that reference outside variables
 */
export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.RGF);

  const rgfArrayName = me.getPlaceholder() + "_rgf";
  const rgfEvalName = me.getPlaceholder() + "_rgf_eval";
  const rgfArrayExpression = t.arrayExpression([]);

  return {
    visitor: {
      Program: {
        exit(path) {
          if (rgfArrayExpression.elements.length === 0) return;

          // Insert the RGF array at the top of the program

          function prepend(node: t.Statement) {
            var newPath = path.unshiftContainer("body", node)[0];
            path.scope.registerDeclaration(newPath);
          }

          prepend(
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(rgfArrayName),
                rgfArrayExpression
              ),
            ])
          );

          prepend(
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(rgfEvalName),
                t.identifier("eval")
              ),
            ])
          );
        },
      },
      "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression": {
        exit(_path) {
          const path = _path as NodePath<t.FunctionDeclaration>;

          // Skip async and generator functions
          if (path.node.async || path.node.generator) return;

          // Don't apply to arrow functions
          if (t.isArrowFunctionExpression(path.node)) return;

          const name = getFunctionName(path);
          if (name === me.options.lock?.countermeasures) return;
          me.log(name);

          if (!computeProbabilityMap(me.options.rgf, name)) return;

          // Skip functions with references to outside variables
          // Check the scope to see if this function relies on any variables defined outside the function
          var identifierPreventingTransform: string;

          path.traverse({
            ReferencedIdentifier(refPath) {
              const { name } = refPath.node;
              // RGF array name is allowed, it is not considered an outside reference
              if (name === rgfArrayName) return;

              const binding = refPath.scope.getBinding(name);
              if (!binding) return;

              // If the binding is not in the current scope, it is an outside reference
              if (binding.scope !== path.scope) {
                identifierPreventingTransform = name;
              }
            },
          });

          if (identifierPreventingTransform) {
            me.log(
              "Skipping function " +
                name +
                " due to reference to outside variable:" +
                identifierPreventingTransform
            );
            return;
          }

          const embeddedName = me.getPlaceholder() + "_embedded";
          const replacementName = me.getPlaceholder() + "_replacement";
          const thisName = me.getPlaceholder() + "_this";

          const lastNode = t.expressionStatement(t.identifier(embeddedName));
          (lastNode as NodeSymbol)[SKIP] = true;

          // Transform the function
          const evalTree: t.Program = t.program([
            t.functionDeclaration(
              t.identifier(embeddedName),
              [],
              t.blockStatement([
                t.variableDeclaration("var", [
                  t.variableDeclarator(
                    t.arrayPattern([
                      t.identifier(thisName),
                      t.identifier(rgfArrayName),
                    ]),
                    t.thisExpression()
                  ),
                ]),
                t.functionDeclaration(
                  t.identifier(replacementName),
                  path.node.params as (t.Identifier | t.Pattern)[],
                  path.node.body
                ),
                t.returnStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(replacementName),
                      t.identifier("apply")
                    ),
                    [t.identifier(thisName), t.identifier("arguments")]
                  )
                ),
              ])
            ),
            lastNode,
          ]);
          const evalFile = t.file(evalTree);

          var newObfuscator = new Obfuscator(me.options);

          var hasRan = new Set(
            me.obfuscator.plugins
              .filter((plugin, i) => {
                return i <= me.obfuscator.index;
              })
              .map((plugin) => plugin.pluginInstance.order)
          );

          newObfuscator.plugins = newObfuscator.plugins.filter((plugin) => {
            return (
              plugin.pluginInstance.order == Order.Preparation ||
              !hasRan.has(plugin.pluginInstance.order)
            );
          });

          newObfuscator.obfuscateAST(evalFile);

          const generated = Obfuscator.generateCode(evalFile);

          var functionExpression = t.callExpression(t.identifier(rgfEvalName), [
            t.stringLiteral(generated),
          ]);

          var index = rgfArrayExpression.elements.length;
          rgfArrayExpression.elements.push(functionExpression);

          // Params no longer needed, using 'arguments' instead
          path.node.params = [];

          // Function is now unsafe
          (path.node as NodeSymbol)[UNSAFE] = true;

          path
            .get("body")
            .replaceWith(
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.memberExpression(
                        t.identifier(rgfArrayName),
                        t.numericLiteral(index),
                        true
                      ),
                      t.stringLiteral("apply"),
                      true
                    ),
                    [
                      t.arrayExpression([
                        t.identifier("this"),
                        t.identifier(rgfArrayName),
                      ]),
                      t.identifier("arguments"),
                    ]
                  )
                ),
              ])
            );
        },
      },
    },
  };
};
