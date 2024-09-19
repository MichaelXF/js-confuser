import { NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "./plugin";
import * as t from "@babel/types";
import { ok } from "assert";
import { Order } from "../order";
import { NodeSymbol, SKIP } from "../constants";
import Template from "../templates/template";
import { append } from "../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.AstScrambler, {
    changeData: {
      expressions: 0,
    },
  });
  var callExprName: string;

  return {
    visitor: {
      "Block|SwitchCase": {
        exit(_path) {
          const path = _path as NodePath<t.Block | t.SwitchCase>;
          const isProgram = path.isProgram();

          let containerKey: string;
          if (path.isSwitchCase()) {
            containerKey = "consequent";
          } else if (path.isBlock()) {
            containerKey = "body";
          }
          var container: t.Statement[] = path.node[containerKey];
          var newContainer: t.Statement[] = [];

          ok(Array.isArray(container));

          var expressions: t.Expression[] = [];

          const flushExpressions = () => {
            if (!expressions.length) return;

            // Not enough expressions to require a call expression
            if (expressions.length === 1) {
              newContainer.push(t.expressionStatement(expressions[0]));
              expressions = [];
              return;
            }

            if (!callExprName) {
              callExprName = me.getPlaceholder() + "_ast";
            }

            me.changeData.expressions += expressions.length;

            newContainer.push(
              t.expressionStatement(
                t.callExpression(t.identifier(callExprName), expressions)
              )
            );
            expressions = [];
          };

          for (var statement of container) {
            if (
              // Preserve last expression at the top level
              (isProgram ? statement !== container.at(-1) : true) &&
              t.isExpressionStatement(statement) &&
              !(statement as NodeSymbol)[SKIP]
            ) {
              if (t.isSequenceExpression(statement.expression)) {
                expressions.push(...statement.expression.expressions);
              } else {
                expressions.push(statement.expression);
              }
            } else {
              flushExpressions();
              newContainer.push(statement);
            }
          }

          flushExpressions();

          path.node[containerKey] = newContainer;

          if (path.isProgram()) {
            if (callExprName) {
              var functionDeclaration = new Template(`
                function ${callExprName}(){
                  ${callExprName} = function(){};
                }
                `).single();

              append(path, functionDeclaration);
            }
          }
        },
      },
    },
  };
};
