import {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Literal,
} from "../../util/gen";
import Transform from "../transform";

export default class AntiTemplate extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return (
      object.type == "TemplateLiteral" ||
      object.type == "TaggedTemplateExpression"
    );
  }

  transform(object, parents) {
    return () => {
      if (object.type == "TemplateLiteral") {
        if (
          parents[0].type == "TaggedTemplateExpression" &&
          parents[0].quasi == object
        ) {
          return;
        }

        if (object.quasis.length == 1 && object.expressions.length == 0) {
          this.replace(object, Literal(object.quasis[0].value.cooked));
        } else {
          var binaryExpression = null;

          object.quasis.forEach((q, i) => {
            var expr = object.expressions[i];
            var str = Literal(q.value.cooked);

            if (!binaryExpression) {
              binaryExpression = BinaryExpression("+", str, expr);
            } else {
              if (expr) {
                binaryExpression.right = BinaryExpression(
                  "+",
                  binaryExpression.right,
                  BinaryExpression("+", str, expr)
                );
              } else {
                binaryExpression.right = BinaryExpression(
                  "+",
                  binaryExpression.right,
                  str
                );
              }
            }
          });

          this.replace(object, binaryExpression);
        }
      } else if (object.type == "TaggedTemplateExpression") {
        var literal = object.quasi;

        this.replace(
          object,
          CallExpression(object.tag, [
            ArrayExpression(literal.quasis.map((x) => Literal(x.value.cooked))),
            ...literal.expressions,
          ])
        );
      }
    };
  }
}
