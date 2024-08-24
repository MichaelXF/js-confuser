import { PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { chance, choice } from "../utils/random-utils";
import { blockStatement, booleanLiteral, ifStatement } from "@babel/types";
import { deadCodeTemplates } from "../templates/deadCodeTemplates";
import { computeProbabilityMap } from "../probability";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin("deadCode");
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

          path.unshiftContainer(
            "body",
            ifStatement(booleanLiteral(false), blockStatement([...nodes]))
          );
          path.stop();
        },
      },
    },
  };
};
