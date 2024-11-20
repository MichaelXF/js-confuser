import { PluginArg, PluginObject } from "./plugin";
import { choice } from "../utils/random-utils";
import { deadCodeTemplates } from "../templates/deadCodeTemplates";
import { Order } from "../order";
import * as t from "@babel/types";
import Template from "../templates/template";
import { prepend } from "../utils/ast-utils";
import PredicateGen from "../utils/PredicateGen";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.DeadCode, {
    changeData: {
      deadCode: 0,
    },
  });
  let predicateGen = new PredicateGen(me);

  return {
    visitor: {
      Block: {
        exit(blockPath) {
          if (blockPath.find((p) => me.isSkipped(p))) return;

          if (!me.computeProbabilityMap(me.options.deadCode)) {
            return;
          }

          // Default limit on dead code
          // May be overridden by user
          if (
            typeof me.options.deadCode !== "function" &&
            typeof me.options.deadCode !== "object"
          ) {
            let suggestedMax = 20;
            if (me.obfuscator.parentObfuscator) {
              // RGF should contain less dead code
              suggestedMax = 5;
            }

            if (me.changeData.deadCode >= suggestedMax) {
              return;
            }
          }

          // Increment dead code counter
          me.changeData.deadCode++;

          var template = choice(deadCodeTemplates);
          var nodes = template.compile();

          var containingFnName = me.getPlaceholder(
            "dead_" + me.changeData.deadCode
          );

          // Insert dummy function
          prepend(
            blockPath,

            t.functionDeclaration(
              t.identifier(containingFnName),
              [],
              t.blockStatement([...nodes])
            )
          );

          prepend(
            blockPath,
            new Template(`
              if({falsePredicate}) {
                ${containingFnName}()
              }
              `).single({
              falsePredicate: predicateGen.generateFalseExpression(blockPath),
            })
          );

          me.skip(blockPath);
        },
      },
    },
  };
};
