import { NodePath, PluginObj } from "@babel/core";
import { Order } from "../../order";
import { PluginArg } from "../plugin";
import { NodeSymbol, PREDICTABLE } from "../../constants";
import * as t from "@babel/types";
import { isStaticValue } from "../../utils/static-utils";
import { isFunctionStrictMode } from "../../utils/function-utils";
import { prepend } from "../../utils/ast-utils";
import Template from "../../templates/template";

/**
 * Moved Declarations moves variables in two ways:
 *
 * 1) Move variables to top of the current block
 * 2) Move variables as unused function parameters
 */
export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.MovedDeclarations);

  return {
    visitor: {
      FunctionDeclaration: {
        exit(path) {
          var functionPath = path.findParent((path) =>
            path.isFunction()
          ) as NodePath<t.Function>;

          if (!functionPath || !(functionPath.node as NodeSymbol)[PREDICTABLE])
            return;

          // Must be direct child of the function
          if (path.parentPath !== functionPath.get("body")) return;

          // Rest params check
          if (functionPath.get("params").find((p) => p.isRestElement())) return;

          var isStrictMode = isFunctionStrictMode(functionPath);

          if (isStrictMode) return;

          const functionName = path.node.id.name;

          var functionExpression = path.node as t.Node as t.FunctionExpression;
          functionExpression.type = "FunctionExpression";
          functionExpression.id = null;

          var identifier = t.identifier(functionName);
          functionPath.node.params.push(identifier);

          var paramPath = functionPath.get("params").at(-1);

          // Update binding to point to new path
          const binding = functionPath.scope.getBinding(functionName);
          if (binding) {
            binding.kind = "param";
            binding.path = paramPath;
            binding.identifier = identifier;
          }

          prepend(
            functionPath,
            new Template(`
              if(!${functionName}) {
                ${functionName} = {functionExpression};
              }
              `).single({ functionExpression: functionExpression })
          );

          path.remove();
        },
      },
      VariableDeclaration: {
        exit(path) {
          if (path.node.kind !== "var") return;
          if (path.node.declarations.length !== 1) return;

          var insertionMethod = "variableDeclaration";
          var functionPath = path.findParent((path) =>
            path.isFunction()
          ) as NodePath<t.Function>;

          var allowDefaultParamValue = true;

          if (functionPath && (functionPath.node as NodeSymbol)[PREDICTABLE]) {
            // Check for "use strict" directive
            // Strict mode disallows non-simple parameters
            // So we can't move the declaration to the function parameters
            var isStrictMode = isFunctionStrictMode(functionPath);
            if (isStrictMode) {
              allowDefaultParamValue = false;
            }

            // Cannot add variables after rest element
            if (!functionPath.get("params").find((p) => p.isRestElement())) {
              insertionMethod = "functionParameter";
            }
          }

          const declaration = path.node.declarations[0];
          if (!t.isIdentifier(declaration.id)) return;

          const { name } = declaration.id;
          const value = declaration.init || t.identifier("undefined");

          const isStatic = isStaticValue(value);
          let isDefinedAtTop = false;
          const parentPath = path.parentPath;
          if (parentPath.isBlock()) {
            isDefinedAtTop = parentPath.get("body").indexOf(path) === 0;
          }

          // Already at the top - nothing will change
          if (insertionMethod === "variableDeclaration" && isDefinedAtTop) {
            return;
          }

          let defaultParamValue: t.Expression;

          if (
            insertionMethod === "functionParameter" &&
            isStatic &&
            isDefinedAtTop &&
            allowDefaultParamValue
          ) {
            defaultParamValue = value;
            path.remove();
          } else {
            // For-in / For-of can only reference the variable name
            if (
              parentPath.isForInStatement() ||
              parentPath.isForOfStatement()
            ) {
              path.replaceWith(t.identifier(name));
            } else {
              path.replaceWith(
                t.assignmentExpression(
                  "=",
                  t.identifier(name),
                  declaration.init || t.identifier("undefined")
                )
              );
            }
          }

          switch (insertionMethod) {
            case "functionParameter":
              var identifier = t.identifier(name);

              var param: t.Pattern | t.Identifier = identifier;
              if (allowDefaultParamValue && defaultParamValue) {
                param = t.assignmentPattern(param, defaultParamValue);
              }

              functionPath.node.params.push(param);

              var paramPath = functionPath.get("params").at(-1);

              // Update binding to point to new path
              const binding = functionPath.scope.getBinding(name);
              if (binding) {
                binding.kind = "param";
                binding.path = paramPath;
                binding.identifier = identifier;
              }

              break;
            case "variableDeclaration":
              var block = path.findParent((path) =>
                path.isBlock()
              ) as NodePath<t.Block>;

              var topNode = block.node.body[0];
              const variableDeclarator = t.variableDeclarator(
                t.identifier(name)
              );

              if (t.isVariableDeclaration(topNode) && topNode.kind === "var") {
                topNode.declarations.push(variableDeclarator);
                break;
              } else {
                block.node.body.unshift(
                  t.variableDeclaration("var", [variableDeclarator])
                );
              }

              break;
          }
        },
      },
    },
  };
};
