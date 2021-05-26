import { Node, UnaryExpression } from "./gen";
import { walk } from "../traverse";

export function inverseExpression(expr: Node) {
  /**
   * !x -> x
   */
  if (expr.type == "UnaryExpression" && expr.operator == "!" && expr.prefix) {
    return expr.argument;
  }

  var inverseMapping = {
    BinaryExpression: {
      "<": ">=",
      ">": "<=",
      "<=": ">",
      ">=": "<",
      "==": "!=",
      "===": "!=",
      "!=": "==",
      "!==": "===",
    },
  };

  if (!inverseMapping[expr.type]) {
    return UnaryExpression("!", expr);
  }

  var safe = new Set(["Literal", "Identifier", "MemberExpression"]);

  var canInvert = true;
  walk(expr, [], (object: Node, parents: Node[]) => {
    if (object.type) {
      var hasInverse =
        inverseMapping[object.type] &&
        inverseMapping[object.type][object.operator];

      if (!safe.has(object.type) && !hasInverse) {
        // console.log(object.type);
        canInvert = false;
      }
    }
  });

  if (canInvert) {
    walk(expr, [], (object: Node, parents: Node[]) => {
      if (object.operator) {
        object.operator = inverseMapping[object.type][object.operator];
      }
    });

    return expr;
  } else {
    return UnaryExpression("!", expr);
  }
}
