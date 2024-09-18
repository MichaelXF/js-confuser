import { PluginArg, PluginObject } from "./plugin";
import * as t from "@babel/types";
import { Order } from "../order";
import { ok } from "assert";
import { NameGen } from "../utils/NameGen";
import { prependProgram } from "../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Calculator, {
    changeData: {
      expressions: 0,
    },
  });

  const nameGen = new NameGen(me.options.identifierGenerator);

  return {
    visitor: {
      Program: {
        exit(programPath) {
          const allowedBinaryOperators = new Set(["+", "-", "*", "/"]);
          var operatorsMap = new Map<string, string>();
          var calculatorFnName = me.getPlaceholder() + "_calc";

          programPath.traverse({
            BinaryExpression: {
              exit(path) {
                const { operator } = path.node;

                if (t.isPrivate(path.node.left)) return;

                // TODO: Improve precedence handling or remove this transformation entirely
                if (!t.isNumericLiteral(path.node.right)) return;
                if (!t.isNumericLiteral(path.node.left)) return;

                if (!allowedBinaryOperators.has(operator)) return;

                const mapKey = "binaryExpression_" + operator;
                let operatorKey = operatorsMap.get(mapKey);

                // Add binary operator to the map if it doesn't exist
                if (typeof operatorKey === "undefined") {
                  operatorKey = nameGen.generate();
                  operatorsMap.set(mapKey, operatorKey);
                }

                ok(operatorKey);

                me.changeData.expressions++;

                path.replaceWith(
                  t.callExpression(t.identifier(calculatorFnName), [
                    t.stringLiteral(operatorKey),
                    path.node.left,
                    path.node.right,
                  ])
                );
              },
            },
          });

          // No operators created
          if (operatorsMap.size < 1) {
            return;
          }

          // Create the calculator function and insert into program path
          var switchCases: t.SwitchCase[] = Array.from(
            operatorsMap.entries()
          ).map(([mapKey, key]) => {
            const [type, operator] = mapKey.split("_");

            let expression = t.binaryExpression(
              operator as any,
              t.identifier("a"),
              t.identifier("b")
            );

            return t.switchCase(t.stringLiteral(key), [
              t.returnStatement(expression),
            ]);
          });

          prependProgram(
            programPath,

            t.functionDeclaration(
              t.identifier(calculatorFnName),
              [t.identifier("operator"), t.identifier("a"), t.identifier("b")],
              t.blockStatement([
                t.switchStatement(t.identifier("operator"), switchCases),
              ])
            )
          );
        },
      },
    },
  };
};
