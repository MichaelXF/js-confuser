import { PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { chance, choice } from "../utils/random-utils";
import { deadCodeTemplates } from "../templates/deadCodeTemplates";
import { computeProbabilityMap } from "../probability";
import { Order } from "../order";
import * as t from "@babel/types";
import Template from "../templates/template";
import { NameGen } from "../utils/NameGen";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.DeadCode);
  let created = 0;

  return {
    visitor: {
      Block: {
        exit(path) {
          if (path.node.body.length === 0) {
            return;
          }

          if (!computeProbabilityMap(me.options.deadCode)) {
            return;
          }

          if (created > 100 && chance(created - 100)) return;
          created++;

          var template = choice(deadCodeTemplates);
          var nodes = template.compile();

          var containingFnName = me.getPlaceholder("dead_" + created);

          var newPath = path.unshiftContainer(
            "body",
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

          do {
            randomProperty = nameGen.generate();
          } while (
            !randomProperty ||
            PrototypeCollision[randomProperty] !== undefined
          );

          path.pushContainer(
            "body",
            new Template(`
              if("${randomProperty}" in ${containingFnName}) {
                ${containingFnName}()
              }
              `).single()
          );

          path.stop();
        },
      },
    },
  };
};
