import { PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import * as t from "@babel/types";
import { Order } from "../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Calculator);

  return {
    visitor: {
      Program: {
        exit(path) {
          var allowedOperators = new Set(["+", "-", "*", "/"]);
          var operatorsMap = new Map<string, string>();
          var calculatorFnName;

          path.traverse({
            BinaryExpression: {
              exit(path) {
                const { operator } = path.node;

                if (t.isPrivate(path.node.left)) return;

                if (!allowedOperators.has(operator)) return;

                if (!calculatorFnName) {
                  calculatorFnName = me.getPlaceholder() + "_calc";
                }

                const operatorKey = operatorsMap.get(operator);
                if (typeof operatorKey === "undefined") {
                  operatorsMap.set(operator, me.getPlaceholder());
                }

                path.replaceWith(
                  t.callExpression(t.identifier(calculatorFnName), [
                    t.identifier(operatorsMap.get(operator) as string),
                    path.node.left,
                    path.node.right,
                  ])
                );
              },
            },
          });

          if (calculatorFnName) {
            // Create the calculator function and insert into program path

            var p = path.unshiftContainer(
              "body",
              t.functionDeclaration(
                t.identifier(calculatorFnName),
                [
                  t.identifier("operator"),
                  t.identifier("a"),
                  t.identifier("b"),
                ],
                t.blockStatement([
                  t.returnStatement(
                    t.binaryExpression(
                      "+",
                      t.identifier("a"),
                      t.identifier("b")
                    )
                  ),
                ])
              )
            );

            path.scope.registerDeclaration(p[0]);
          }
        },
      },
    },
  };
};
