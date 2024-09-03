import { NodePath, PluginObj } from "@babel/core";
import { Order } from "../../order";
import { PluginArg } from "../plugin";
import { NodeSymbol, PREDICTABLE } from "../../constants";
import * as t from "@babel/types";
import { isStaticValue } from "../../utils/static-utils";
import { isFunctionStrictMode } from "../../utils/function-utils";

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
              var param: t.Pattern | t.Identifier = t.identifier(name);
              if (allowDefaultParamValue && defaultParamValue) {
                param = t.assignmentPattern(param, defaultParamValue);
              }

              functionPath.node.params.push(param);

              var paramPath = functionPath.get("params").at(-1);

              functionPath.scope.registerBinding("param", paramPath);
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
