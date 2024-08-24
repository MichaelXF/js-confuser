import { ObfuscateOrder } from "../order";
import Template from "../templates/template";
import { isBlock } from "../traverse";
import {
  Node,
  ExpressionStatement,
  CallExpression,
  Identifier,
} from "../util/gen";
import { prepend } from "../util/insert";
import Transform from "./transform";

// JsNice.org tries to separate sequence expressions into multiple lines, this stops that.
export default class AntiTooling extends Transform {
  fnName: string;

  constructor(o) {
    super(o, ObfuscateOrder.AntiTooling);
  }

  apply(tree: Node) {
    super.apply(tree);

    if (typeof this.fnName === "string") {
      prepend(
        tree,
        new Template(`
      function {fnName}(){
      }
      `).single({ fnName: this.fnName })
      );
    }
  }

  match(object, parents) {
    return isBlock(object) || object.type == "SwitchCase";
  }

  transform(object, parents) {
    return () => {
      var exprs: Node[] = [];
      var deleteExprs: Node[] = [];

      var body: Node[] =
        object.type == "SwitchCase" ? object.consequent : object.body;

      const end = () => {
        function flatten(expr: Node) {
          if (expr.type == "ExpressionStatement") {
            flatten(expr.expression);
          } else if (expr.type == "SequenceExpression") {
            expr.expressions.forEach(flatten);
          } else {
            flattened.push(expr);
          }
        }

        var flattened = [];
        exprs.forEach(flatten);

        if (flattened.length > 1) {
          flattened[0] = { ...flattened[0] };

          if (!this.fnName) {
            this.fnName = this.getPlaceholder();
          }

          // (expr1,expr2,expr3) -> F(expr1, expr2, expr3)
          this.replace(
            exprs[0],
            ExpressionStatement(
              CallExpression(Identifier(this.fnName), [...flattened])
            )
          );

          deleteExprs.push(...exprs.slice(1));
        }
        exprs = [];
      };

      body.forEach((stmt, i) => {
        if (stmt.hidden || stmt.directive) {
          return;
        }
        if (stmt.type == "ExpressionStatement") {
          exprs.push(stmt);
        } else {
          end();
        }
      });

      end();

      deleteExprs.forEach((expr) => {
        var index = body.indexOf(expr);
        if (index !== -1) {
          body.splice(index, 1);
        }
      });
    };
  }
}
