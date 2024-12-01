import { PluginArg, PluginObject } from "../plugin";
import { getRandomInteger, splitIntoChunks } from "../../utils/random-utils";
import { binaryExpression, stringLiteral } from "@babel/types";
import { ok } from "assert";
import { Order } from "../../order";
import {
  ensureComputedExpression,
  isModuleImport,
} from "../../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.StringSplitting, {
    changeData: {
      strings: 0,
    },
  });

  return {
    visitor: {
      StringLiteral: {
        exit(path) {
          var object = path.node;

          // Don't change module imports
          if (isModuleImport(path)) return;

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
            !me.computeProbabilityMap(me.options.stringSplitting, object.value)
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

          me.changeData.strings++;

          ensureComputedExpression(path);

          path.replaceWith(parent);
          path.skip();
        },
      },
    },
  };
};
