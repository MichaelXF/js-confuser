import { PluginObj } from "@babel/core";
import { PluginArg, PluginInstance } from "../plugin";
import { getRandomInteger, splitIntoChunks } from "../../utils/random-utils";
import { computeProbabilityMap } from "../../probability";
import { binaryExpression, stringLiteral } from "@babel/types";
import { ok } from "assert";
import { Order } from "../../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.StringSplitting);

  return {
    visitor: {
      StringLiteral: {
        exit(path) {
          var object = path.node;

          var size = Math.round(
            Math.max(6, object.value.length / getRandomInteger(3, 8))
          );
          if (object.value.length <= size) {
            return;
          }

          var chunks = splitIntoChunks(object.value, size);
          if (!chunks || chunks.length <= 1) {
            return;
          }

          if (
            !computeProbabilityMap(
              me.options.stringSplitting,
              (x) => x,
              object.value
            )
          ) {
            return;
          }

          var binExpr;
          var parent;
          var last = chunks.pop();
          chunks.forEach((chunk, i) => {
            if (i == 0) {
              parent = binExpr = binaryExpression(
                "+",
                stringLiteral(chunk),
                stringLiteral("")
              );
            } else {
              binExpr.left = binaryExpression(
                "+",
                { ...binExpr.left },
                stringLiteral(chunk)
              );
              ok(binExpr);
            }
          });

          parent.right = stringLiteral(last);

          path.replaceWith(parent);
        },
      },
    },
  };
};
