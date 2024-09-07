import { NodePath, PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import { Order } from "../order";
import { ensureComputedExpression, prepend } from "../utils/ast-utils";
import * as t from "@babel/types";
import { NameGen } from "../utils/NameGen";
import { getRandomInteger } from "../utils/random-utils";
import { Binding, Visitor } from "@babel/traverse";

interface FunctionOutliningInterface {
  objectName: string;
  add: (node: t.Expression) => t.Expression;
}

const FUNCTION_OUTLINING = Symbol("functionOutlining");

interface NodeFunctionOutlining {
  [FUNCTION_OUTLINING]?: FunctionOutliningInterface;
}

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
    path.isContinueStatement() ||
    path.isBreakStatement() ||
    path.isThrowStatement() ||
    path.isYieldExpression() ||
    path.isAwaitExpression() ||
    path.isDebuggerStatement() ||
    path.isImportDeclaration() ||
    path.isExportDeclaration()
  ) {
    return { isSafe: false };
  }

  var isSafe = true;
  var bindings: Binding[] = [];

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
  };

  // Exclude 'ThisExpression' and semantic 'Identifier' nodes
  if (visitor[path.type]) return { isSafe: false };

  path.traverse(visitor);

  return { isSafe, bindings };
}

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.FunctionOutlining);

  function addToOutliningObject(path: NodePath, node: t.Expression) {
    var block = path.findParent((p) => p.isBlock());
    if (!block) return;

    let fnInterface = (block.node as NodeFunctionOutlining)[FUNCTION_OUTLINING];

    if (!fnInterface) {
      var objectName = me.getPlaceholder();

      var newPath = prepend(
        block,
        t.variableDeclaration("var", [
          t.variableDeclarator(
            t.identifier(objectName),
            t.objectExpression([])
          ),
        ])
      )[0] as NodePath<t.VariableDeclaration>;
      me.skip(newPath);

      let gen = new NameGen(me.options.identifierGenerator);

      var objectExpression = newPath.node.declarations[0]
        .init as t.ObjectExpression;
      fnInterface = {
        add: (node) => {
          const property = gen.generate();
          objectExpression.properties.push(
            t.objectProperty(t.identifier(property), node)
          );
          me.skip(objectExpression);

          return t.memberExpression(
            t.identifier(objectName),
            t.stringLiteral(property),
            true
          );
        },
        objectName,
      };

      (block.node as NodeFunctionOutlining)[FUNCTION_OUTLINING] = fnInterface;
    }

    return fnInterface.add(node);
  }

  return {
    visitor: {
      Block: {
        exit(path) {
          if (path.isProgram()) {
            path.scope.crawl();
          }
          if (path.find((p) => me.isSkipped(p))) return;
          // Extract a random number of statements

          var statements = path.get("body");
          var startIndex = getRandomInteger(0, statements.length);
          var endIndex = getRandomInteger(startIndex, statements.length);

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

          var isFirst = true;
          for (var statement of extractedStatements) {
            if (isFirst) {
              isFirst = false;
              var memberExpression = addToOutliningObject(
                statement,
                t.functionExpression(
                  null,
                  [],
                  t.blockStatement(extractedStatements.map((x) => x.node))
                )
              );
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

          if (path.find((p) => me.isSkipped(p))) return;
          if (!isSafeForOutlining(path).isSafe) return;

          var memberExpression = addToOutliningObject(
            path,
            t.functionExpression(
              null,
              [],
              t.blockStatement([t.returnStatement(t.cloneNode(path.node))])
            )
          );

          var callExpression = t.callExpression(memberExpression, []);

          ensureComputedExpression(path);
          path.replaceWith(callExpression);
          me.skip(path);
        },
      },
    },
  };
};
