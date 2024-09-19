import { NodePath } from "@babel/core";
import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";
import { ensureComputedExpression, prepend } from "../utils/ast-utils";
import * as t from "@babel/types";
import { NameGen } from "../utils/NameGen";
import { chance, getRandomInteger } from "../utils/random-utils";
import { Binding, Visitor } from "@babel/traverse";
import { computeProbabilityMap } from "../probability";

function isSafeForOutlining(path: NodePath): {
  isSafe: boolean;
  bindings?: Binding[];
} {
  if (path.isIdentifier() || path.isLiteral()) return { isSafe: false };

  // Skip direct invocations ('this' will be different)
  if (path.key === "callee" && path.parentPath.isCallExpression()) {
    return { isSafe: false };
  }

  // Skip typeof and delete expressions (identifier behavior is different)
  if (path.key === "argument" && path.parentPath.isUnaryExpression()) {
    return { isSafe: false };
  }

  if (
    path.isReturnStatement() ||
    path.isYieldExpression() ||
    path.isAwaitExpression() ||
    path.isContinueStatement() ||
    path.isBreakStatement() ||
    path.isThrowStatement() ||
    path.isDebuggerStatement() ||
    path.isImportDeclaration() ||
    path.isExportDeclaration()
  ) {
    return { isSafe: false };
  }

  var isSafe = true;
  var bindings: Binding[] = [];
  var fnPath = path.getFunctionParent();

  var visitor: Visitor = {
    ThisExpression(path) {
      isSafe = false;
      path.stop();
    },
    Identifier(path) {
      if (["arguments", "eval"].includes(path.node.name)) {
        isSafe = false;
        path.stop();
      }
    },
    BindingIdentifier(path) {
      var binding = path.scope.getBinding(path.node.name);
      if (binding) {
        bindings.push(binding);
      }
    },
    // Function flow guard
    "ReturnStatement|YieldExpression|AwaitExpression"(path) {
      if (path.getFunctionParent() === fnPath) {
        isSafe = false;
        path.stop();
      }
    },
  };

  // Exclude 'ThisExpression' and semantic 'Identifier' nodes
  if (visitor[path.type]) return { isSafe: false };

  path.traverse(visitor);

  return { isSafe, bindings };
}

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.FunctionOutlining, {
    changeData: {
      functionsMade: 0,
    },
  });

  var changesMade = 0;

  function checkProbability() {
    if (!computeProbabilityMap(me.options.functionOutlining)) return false;

    if (changesMade > 100 && chance(changesMade - 100)) return false;

    return true;
  }

  return {
    visitor: {
      Block: {
        exit(blockPath) {
          if (blockPath.isProgram()) {
            blockPath.scope.crawl();
          }

          if (blockPath.find((p) => me.isSkipped(p))) return;

          if (!checkProbability()) return;

          // Extract a random number of statements

          var statements = blockPath.get("body");
          // var startIndex = getRandomInteger(0, statements.length);
          // var endIndex = getRandomInteger(startIndex, statements.length);

          var startIndex = 0;
          var endIndex = statements.length;

          var extractedStatements = statements.slice(startIndex, endIndex);
          if (!extractedStatements.length) return;

          var bindings: Binding[] = [];

          for (var statement of extractedStatements) {
            // Don't override the control node
            if (me.isSkipped(statement)) return;

            var result = isSafeForOutlining(statement);
            if (!result.isSafe) {
              return;
            }

            bindings.push(...result.bindings);
          }

          const extractedStatementSet = new Set<NodePath>(extractedStatements);

          for (var binding of bindings) {
            for (var referencePath of binding.referencePaths) {
              var found = referencePath.find((p) =>
                extractedStatementSet.has(p)
              );
              if (!found) {
                return;
              }
            }
            for (var constantViolation of binding.constantViolations) {
              var found = constantViolation.find((p) =>
                extractedStatementSet.has(p)
              );
              if (!found) {
                return;
              }
            }
          }

          changesMade++;

          var isFirst = true;
          for (var statement of extractedStatements) {
            if (isFirst) {
              isFirst = false;
              var memberExpression = me
                .getControlObject(blockPath)
                .addProperty(
                  t.functionExpression(
                    null,
                    [],
                    t.blockStatement(extractedStatements.map((x) => x.node))
                  )
                );

              me.changeData.functionsMade++;

              var callExpression = t.callExpression(memberExpression, []);

              statement.replaceWith(callExpression);
              continue;
            }
            statement.remove();
          }
        },
      },
      Expression: {
        exit(path) {
          // Skip assignment left
          if (
            path.find(
              (p) =>
                p.key === "left" &&
                p.parentPath?.type === "AssignmentExpression"
            )
          ) {
            return;
          }

          if (!checkProbability()) return;

          if (path.find((p) => me.isSkipped(p))) return;
          if (!isSafeForOutlining(path).isSafe) return;

          changesMade++;

          var blockPath = path.find((p) => p.isBlock()) as NodePath<t.Block>;

          var memberExpression = me
            .getControlObject(blockPath)
            .addProperty(
              t.functionExpression(
                null,
                [],
                t.blockStatement([t.returnStatement(t.cloneNode(path.node))])
              )
            );

          me.changeData.functionsMade++;

          var callExpression = t.callExpression(memberExpression, []);

          ensureComputedExpression(path);
          path.replaceWith(callExpression);
          me.skip(path);
        },
      },
    },
  };
};
