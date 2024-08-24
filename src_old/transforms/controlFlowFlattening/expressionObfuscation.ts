import { criticalFunctionTag } from "../../constants";
import Template from "../../templates/template";
import { isBlock } from "../../traverse";
import {
  CallExpression,
  Identifier,
  Node,
  SequenceExpression,
} from "../../util/gen";
import { prepend } from "../../util/insert";
import Transform from "../transform";

/**
 * Expression Obfuscation runs before Control Flow Flattening
 */
export default class ExpressionObfuscation extends Transform {
  fnName: string;

  constructor(o) {
    super(o);
  }

  apply(tree: Node): void {
    super.apply(tree);

    if (typeof this.fnName === "string") {
      prepend(
        tree,
        new Template(`
        function {fnName}(...args){
          return args[args["length"] - 1]
        }
        `).single({ fnName: this.fnName })
      );
    }
  }

  createSequenceExpression(expressions: Node[]): Node {
    if (!this.fnName) {
      this.fnName = this.getPlaceholder() + criticalFunctionTag;
    }

    return CallExpression(Identifier(this.fnName), [...expressions]);
  }

  match(object, parents) {
    return isBlock(object);
  }

  transform(object, parents) {
    return () => {
      var exprs = [];
      var deleteExprs = [];

      object.body.forEach((stmt, i) => {
        if (stmt.type == "ExpressionStatement" && !stmt.directive) {
          var expr = stmt.expression;

          if (
            expr.type == "UnaryExpression" &&
            !(
              expr.operator === "typeof" && expr.argument.type === "Identifier"
            ) &&
            exprs.length // typeof is special
          ) {
            expr.argument = SequenceExpression([
              ...exprs,
              { ...expr.argument },
            ]);
            deleteExprs.push(...exprs);

            exprs = [];
          } else {
            exprs.push(expr);
          }
        } else {
          if (exprs.length) {
            if (stmt.type == "IfStatement") {
              if (
                stmt.test.type == "BinaryExpression" &&
                stmt.test.operator !== "**"
              ) {
                if (
                  stmt.test.left.type == "UnaryExpression" &&
                  !(
                    stmt.test.left.operator === "typeof" &&
                    stmt.test.left.argument.type === "Identifier"
                  ) // typeof is special
                ) {
                  stmt.test.left.argument = this.createSequenceExpression([
                    ...exprs,
                    { ...stmt.test.left.argument },
                  ]);
                } else {
                  stmt.test.left = this.createSequenceExpression([
                    ...exprs,
                    { ...stmt.test.left },
                  ]);
                }
              } else if (
                stmt.test.type == "LogicalExpression" &&
                stmt.test.left.type == "BinaryExpression" &&
                stmt.test.operator !== "**" &&
                stmt.test.left.left.type == "UnaryExpression"
              ) {
                stmt.test.left.left.argument = this.createSequenceExpression([
                  ...exprs,
                  { ...stmt.test.left.left.argument },
                ]);
              } else {
                stmt.test = this.createSequenceExpression([
                  ...exprs,
                  { ...stmt.test },
                ]);
              }
              deleteExprs.push(...exprs);
            } else if (
              stmt.type == "ForStatement" ||
              (stmt.type == "LabeledStatement" &&
                stmt.body.type == "ForStatement")
            ) {
              var init = (stmt.type == "LabeledStatement" ? stmt.body : stmt)
                .init;

              if (init) {
                if (init.type == "VariableDeclaration") {
                  init.declarations[0].init = this.createSequenceExpression([
                    ...exprs,
                    {
                      ...(init.declarations[0].init || Identifier("undefined")),
                    },
                  ]);
                  deleteExprs.push(...exprs);
                } else if (init.type == "AssignmentExpression") {
                  init.right = this.createSequenceExpression([
                    ...exprs,
                    {
                      ...(init.right || Identifier("undefined")),
                    },
                  ]);
                  deleteExprs.push(...exprs);
                }
              }
            } else if (stmt.type == "VariableDeclaration") {
              stmt.declarations[0].init = this.createSequenceExpression([
                ...exprs,
                {
                  ...(stmt.declarations[0].init || Identifier("undefined")),
                },
              ]);
              deleteExprs.push(...exprs);
            } else if (stmt.type == "ThrowStatement") {
              stmt.argument = this.createSequenceExpression([
                ...exprs,
                { ...stmt.argument },
              ]);
              deleteExprs.push(...exprs);
            } else if (stmt.type == "ReturnStatement") {
              stmt.argument = this.createSequenceExpression([
                ...exprs,
                { ...(stmt.argument || Identifier("undefined")) },
              ]);
              deleteExprs.push(...exprs);
            }
          }

          exprs = [];
        }
      });

      deleteExprs.forEach((expr) => {
        var index = object.body.findIndex((x) => x.expression === expr);
        if (index !== -1) {
          object.body.splice(index, 1);
        }
      });
    };
  }
}
