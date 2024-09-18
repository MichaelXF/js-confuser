import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";
import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { getBlock } from "../utils/ast-utils";
import { chance, getRandomString } from "../utils/random-utils";
import { computeProbabilityMap } from "../probability";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.OpaquePredicates, {
    changeData: {
      opaquePredicates: 0,
    },
  });

  function createTruePredicate(path: NodePath) {
    const controlObject = me.getControlObject(getBlock(path));

    var trueValue = controlObject.createTruePredicate();

    return trueValue;
  }

  let active = true;
  let transformCount = 0;
  function shouldTransform(path: NodePath) {
    if (!active) return false;
    if (path.find((p) => me.isSkipped(p))) return false;

    if (!computeProbabilityMap(me.options.opaquePredicates)) return false;

    transformCount++;

    const depth = path.getAncestry().length;

    return chance(1000 - transformCount - depth * 100);
  }

  function wrapWithPredicate(path: NodePath) {
    let newExpression = t.logicalExpression(
      "&&",
      createTruePredicate(path),
      path.node as t.Expression
    );

    me.changeData.opaquePredicates++;

    path.replaceWith(me.skip(newExpression));
  }

  return {
    visitor: {
      // if (test) -> if (PREDICATE() && test) {}
      IfStatement: {
        exit(path) {
          if (!shouldTransform(path)) return;
          wrapWithPredicate(path.get("test"));
        },
      },

      // test ? a : b -> PREDICATE() && test ? a : b
      ConditionalExpression: {
        exit(path) {
          if (!shouldTransform(path)) return;

          wrapWithPredicate(path.get("test"));
        },
      },

      // case test: -> case PREDICATE() && test:
      SwitchCase: {
        exit(path) {
          if (!path.node.test) return;
          if (!shouldTransform(path)) return;

          wrapWithPredicate(path.get("test"));
        },
      },

      // return test -> if (predicate()) { return test } else { return fake }
      ReturnStatement: {
        exit(path) {
          if (!path.node.argument) return;
          if (!shouldTransform(path)) return;

          me.changeData.opaquePredicates++;

          path.replaceWith(
            t.ifStatement(
              createTruePredicate(path),
              t.blockStatement([t.returnStatement(path.node.argument)]),
              t.blockStatement([
                t.returnStatement(t.stringLiteral(getRandomString(6))),
              ])
            )
          );

          me.skip(path);
        },
      },
    },
  };
};
