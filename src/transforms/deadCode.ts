import { PluginArg, PluginObject } from "./plugin";
import { chance, choice } from "../utils/random-utils";
import { deadCodeTemplates } from "../templates/deadCodeTemplates";
import { computeProbabilityMap } from "../probability";
import { Order } from "../order";
import * as t from "@babel/types";
import Template from "../templates/template";
import { NameGen } from "../utils/NameGen";
import { prepend } from "../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.DeadCode, {
    changeData: {
      deadCode: 0,
    },
  });
  let created = 0;

  return {
    visitor: {
      Block: {
        exit(blockPath) {
          if (blockPath.find((p) => me.isSkipped(p))) return;

          if (!computeProbabilityMap(me.options.deadCode)) {
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

          // Overcomplicated way to get a random property name that doesn't exist on the Function
          var randomProperty: string;
          var nameGen = new NameGen("randomized");

          function PrototypeCollision() {}
          PrototypeCollision(); // Call it for code coverage :D

          do {
            randomProperty = nameGen.generate();
          } while (
            !randomProperty ||
            PrototypeCollision[randomProperty] !== undefined
          );

          me.changeData.deadCode++;

          prepend(
            blockPath,
            new Template(`
              if("${randomProperty}" in ${containingFnName}) {
                ${containingFnName}()
              }
              `).single()
          );

          me.skip(blockPath);
        },
      },
    },
  };
};
