import { NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";
import * as t from "@babel/types";
import Obfuscator from "../obfuscator";
import { computeProbabilityMap } from "../probability";
import {
  append,
  getFunctionName,
  isDefiningIdentifier,
  isStrictMode,
  isVariableIdentifier,
  prepend,
} from "../utils/ast-utils";
import {
  NodeSymbol,
  PREDICTABLE,
  reservedIdentifiers,
  SKIP,
  UNSAFE,
} from "../constants";
import { computeFunctionLength } from "../utils/function-utils";
import { numericLiteral } from "../utils/node";
import Template from "../templates/template";
import { createEvalIntegrityTemplate } from "../templates/tamperProtectionTemplates";

/**
 * RGF (Runtime-Generated-Function) uses the `new Function("code")` syntax to create executable code from strings.
 *
 * Limitations:
 *
 * 1. Does not apply to async or generator functions
 * 2. Does not apply to functions that reference outside variables
 */
export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.RGF, {
    changeData: {
      functions: 0,
    },
  });

  const rgfArrayName = me.getPlaceholder() + "_rgf";
  const rgfEvalName = me.getPlaceholder() + "_rgf_eval";
  const rgfArrayExpression = t.arrayExpression([]);

  let active = true;

  return {
    visitor: {
      Program: {
        enter(path) {
          path.scope.crawl();
        },
        exit(path) {
          active = false;
          if (rgfArrayExpression.elements.length === 0) return;

          // Insert the RGF array at the top of the program
          prepend(
            path,
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(rgfArrayName),
                rgfArrayExpression
              ),
            ])
          );

          var rgfEvalIntegrity = me.getPlaceholder() + "_rgf_eval_integrity";

          prepend(
            path,
            new Template(`
            {EvalIntegrity}
            var ${rgfEvalIntegrity} = {EvalIntegrityName}();
            `).compile({
              EvalIntegrity: createEvalIntegrityTemplate(me, path),
              EvalIntegrityName: me.getPlaceholder(),
            })
          );

          append(
            path,
            new Template(
              `
              function ${rgfEvalName}(code) {
                if (${rgfEvalIntegrity}) {
                  return eval(code);
                }
              }
              `
            )
              .addSymbols(UNSAFE)
              .single()
          );
        },
      },
      "FunctionDeclaration|FunctionExpression": {
        exit(_path) {
          if (!active) return;
          const path = _path as NodePath<
            t.FunctionDeclaration | t.FunctionExpression
          >;

          if (me.isSkipped(path)) return;

          // Skip async and generator functions
          if (path.node.async || path.node.generator) return;

          const name = getFunctionName(path);
          if (name === me.options.lock?.countermeasures) return;
          if (me.obfuscator.isInternalVariable(name)) return;

          me.log(name);

          if (
            !computeProbabilityMap(
              me.options.rgf,
              name,
              path.getFunctionParent() === null
            )
          )
            return;

          // Skip functions with references to outside variables
          // Check the scope to see if this function relies on any variables defined outside the function
          var identifierPreventingTransform: string;

          path.traverse({
            Identifier(idPath) {
              if (!isVariableIdentifier(idPath)) return;
              if (idPath.isBindingIdentifier() && isDefiningIdentifier(idPath))
                return;

              const { name } = idPath.node;
              // RGF array name is allowed, it is not considered an outside reference
              if (name === rgfArrayName) return;
              if (reservedIdentifiers.has(name)) return;
              if (me.options.globalVariables.has(name)) return;

              const binding = idPath.scope.getBinding(name);
              if (!binding) {
                identifierPreventingTransform = name;
                idPath.stop();
                return;
              }

              // If the binding is not in the current scope, it is an outside reference
              if (binding.scope !== path.scope) {
                identifierPreventingTransform = name;
                idPath.stop();
              }
            },
          });

          if (identifierPreventingTransform) {
            me.log(
              "Skipping function " +
                name +
                " due to reference to outside variable: " +
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
          const evalProgram: t.Program = t.program([
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

          const strictModeEnforcingBlock = path.find((p) => isStrictMode(p));
          if (strictModeEnforcingBlock) {
            // Preserve 'use strict' directive
            // This is necessary to enure subsequent transforms (Control Flow Flattening) are aware of the strict mode directive
            evalProgram.directives.push(
              t.directive(t.directiveLiteral("use strict"))
            );
          }

          const evalFile = t.file(evalProgram);

          var newObfuscator = new Obfuscator(me.options, me.obfuscator);

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

          newObfuscator.obfuscateAST(evalFile, {
            disablePack: true,
          });

          const generated = Obfuscator.generateCode(evalFile);

          var functionExpression = t.callExpression(t.identifier(rgfEvalName), [
            t.stringLiteral(generated),
          ]);

          var index = rgfArrayExpression.elements.length;
          rgfArrayExpression.elements.push(functionExpression);

          // Params no longer needed, using 'arguments' instead
          const originalLength = computeFunctionLength(path);
          path.node.params = [];

          // Function is now unsafe
          (path.node as NodeSymbol)[UNSAFE] = true;
          // Params changed and using 'arguments'
          (path.node as NodeSymbol)[PREDICTABLE] = false;
          me.skip(path);

          // Update body to point to new function
          path
            .get("body")
            .replaceWith(
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.memberExpression(
                        t.identifier(rgfArrayName),
                        numericLiteral(index),
                        true
                      ),
                      t.stringLiteral("apply"),
                      true
                    ),
                    [
                      t.arrayExpression([
                        t.thisExpression(),
                        t.identifier(rgfArrayName),
                      ]),
                      t.identifier("arguments"),
                    ]
                  )
                ),
              ])
            );

          me.setFunctionLength(path, originalLength);

          me.changeData.functions++;
        },
      },
    },
  };
};
