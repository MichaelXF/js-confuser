import { NodePath, PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import * as t from "@babel/types";
import { computeProbabilityMap } from "../probability";
import { getRandomInteger } from "../utils/random-utils";
import Template from "../templates/template";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin("shuffle");

  return {
    visitor: {
      ArrayExpression: {
        exit(path) {
          if (path.node.elements.length <= 3) {
            return;
          }
          var illegalElement = path.node.elements.find((element) => {
            !t.isStringLiteral(element);
          });

          if (illegalElement) return;

          if (!computeProbabilityMap(me.options.shuffle)) {
            return;
          }

          var shift = getRandomInteger(
            1,
            Math.min(40, path.node.elements.length * 6)
          );

          var shiftedElements = [...path.node.elements];
          for (var i = 0; i < shift; i++) {
            shiftedElements.push(shiftedElements.shift());
          }

          var runtimeFn = me.getPlaceholder();

          (path.scope.path as NodePath<t.Block>).unshiftContainer(
            "body",
            new Template(
              `
            function ${runtimeFn}(arr, shift) {
              for (var i = 0; i < shift; i++) {
                arr.push(arr.shift());
              }

              return arr;
            }
            `
            ).single()
          );

          path.replaceWith(
            t.callExpression(t.identifier(runtimeFn), [
              t.arrayExpression(shiftedElements),
              t.numericLiteral(shift),
            ])
          );

          path.skip();
        },
      },
    },
  };
};
