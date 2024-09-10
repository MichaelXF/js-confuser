import { NodePath, PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import * as t from "@babel/types";
import { computeProbabilityMap } from "../probability";
import { getRandomInteger } from "../utils/random-utils";
import Template from "../templates/template";
import { Order } from "../order";
import { isStaticValue } from "../utils/static-utils";
import { NodeSymbol, PREDICTABLE } from "../constants";
import { numericLiteral } from "../utils/node";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Shuffle);

  return {
    visitor: {
      ArrayExpression: {
        exit(path) {
          if (path.node.elements.length <= 3) {
            return;
          }
          var illegalElement = path.node.elements.find((element) => {
            !isStaticValue(element);
          });

          if (illegalElement) return;

          if (!computeProbabilityMap(me.options.shuffle)) {
            return;
          }

          var shift = getRandomInteger(
            1,
            Math.min(30, path.node.elements.length * 6)
          );

          var shiftedElements = [...path.node.elements];
          for (var i = 0; i < shift; i++) {
            shiftedElements.unshift(shiftedElements.pop());
          }

          var block = path.find((p) => p.isBlock()) as NodePath<t.Block>;

          var functionExpression = new Template(
            `
          (function(arr) {
            for (var i = 0; i < {shiftNode}; i++) {
              arr.push(arr.shift());
            }
            return arr;
          })
          `
          ).expression<t.FunctionExpression>({
            shiftNode: numericLiteral(shift),
          });

          (functionExpression as NodeSymbol)[PREDICTABLE] = true;

          var memberExpression = me
            .getControlObject(block)
            .addProperty(functionExpression);

          path.replaceWith(
            t.callExpression(memberExpression, [
              t.arrayExpression(shiftedElements),
            ])
          );

          path.skip();
        },
      },
    },
  };
};
