import { PluginArg, PluginObject } from "./plugin";
import * as t from "@babel/types";
import { getRandomInteger } from "../utils/random-utils";
import Template from "../templates/template";
import { Order } from "../order";
import { isStaticValue } from "../utils/static-utils";
import { PREDICTABLE } from "../constants";
import { numericLiteral } from "../utils/node";
import { prependProgram } from "../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Shuffle, {
    changeData: {
      arrays: 0,
    },
  });

  let fnName: string | null = null;

  return {
    visitor: {
      ArrayExpression: {
        exit(path) {
          if (path.node.elements.length <= 3) {
            return;
          }
          var illegalElement = path.node.elements.find(
            (element) => !isStaticValue(element)
          );

          if (illegalElement) return;

          if (!me.computeProbabilityMap(me.options.shuffle)) {
            return;
          }

          // Create un-shuffling function
          if (!fnName) {
            fnName = me.getPlaceholder() + "_shuffle";

            prependProgram(
              path,
              new Template(
                `
          function ${fnName}(arr, shift) {
            for (var i = 0; i < shift; i++) {
              arr["push"](arr["shift"]());
            }
            return arr;
          }
          `
              )
                .addSymbols(PREDICTABLE)
                .single<t.FunctionDeclaration>()
            );
          }

          var shift = getRandomInteger(
            1,
            Math.min(30, path.node.elements.length * 6)
          );

          var shiftedElements = [...path.node.elements];
          for (var i = 0; i < shift; i++) {
            shiftedElements.unshift(shiftedElements.pop());
          }

          path.replaceWith(
            t.callExpression(t.identifier(fnName), [
              t.arrayExpression(shiftedElements),
              numericLiteral(shift),
            ])
          );

          path.skip();

          me.changeData.arrays++;
        },
      },
    },
  };
};
