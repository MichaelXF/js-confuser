import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";
import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { chance, getRandomString } from "../utils/random-utils";
import PredicateGen from "../utils/PredicateGen";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.OpaquePredicates, {
    changeData: {
      opaquePredicates: 0,
    },
  });

  const predicateGen = new PredicateGen(me);

  function createTruePredicate(path: NodePath) {
    return predicateGen.generateTrueExpression(path);
  }

  let active = true;
  let transformCount = 0;
  function shouldTransform(path: NodePath) {
    if (!active) return false;
    if (path.find((p) => me.isSkipped(p))) return false;

    if (!me.computeProbabilityMap(me.options.opaquePredicates)) return false;

    transformCount++;

    const depth = path.getAncestry().length;

    return chance(500 - transformCount - depth * 100);
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
