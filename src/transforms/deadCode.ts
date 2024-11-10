import { PluginArg, PluginObject } from "./plugin";
import { chance, choice } from "../utils/random-utils";
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
  let created = 0;
  let predicateGen = new PredicateGen(me);

  return {
    visitor: {
      Block: {
        exit(blockPath) {
          if (blockPath.find((p) => me.isSkipped(p))) return;

          if (!me.computeProbabilityMap(me.options.deadCode)) {
            return;
          }

          if (typeof me.options.deadCode !== "function") {
            let suggestedMax = 25;
            if (me.obfuscator.parentObfuscator) {
              // RGF should contain less dead code
              suggestedMax = 5;
            }

            if (created > suggestedMax && chance(created - suggestedMax))
              return;
            created++;
          }

          var template = choice(deadCodeTemplates);
          var nodes = template.compile();

          var containingFnName = me.getPlaceholder("dead_" + created);

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
