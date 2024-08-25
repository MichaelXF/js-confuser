import { NodePath, PluginObj } from "@babel/core";
import { Order } from "../../order";
import { PluginArg } from "../plugin";
import { NodeSymbol, PREDICTABLE } from "../../constants";
import * as t from "@babel/types";
import { isStaticValue } from "../../utils/static-utils";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.MovedDeclarations);

  return {
    visitor: {
      VariableDeclaration: {
        exit(path) {
          if (path.node.kind !== "var") return;

          var insertionMethod = "variableDeclaration";
          var functionPath = path.findParent((path) =>
            path.isFunction()
          ) as NodePath<t.Function>;

          if (functionPath && (functionPath.node as NodeSymbol)[PREDICTABLE]) {
            var strictModeDirective = functionPath.node.body.directives.find(
              (directive) => directive.value.value === "use strict"
            );
            if (!strictModeDirective) {
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

          if (insertionMethod === "variableDeclaration" && isDefinedAtTop) {
            return;
          }

          let defaultParamValue: t.Expression;

          if (
            insertionMethod === "functionParameter" &&
            isStatic &&
            isDefinedAtTop
          ) {
            defaultParamValue = value;
            path.remove();
          } else {
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
              if (defaultParamValue) {
                param = t.assignmentPattern(param, defaultParamValue);
              }

              functionPath.node.params.push(param);
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
