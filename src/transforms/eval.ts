import { compileJsSync } from "../compiler";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import {
  CallExpression,
  Identifier,
  Literal,
  Node,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { isFunction } from "../util/insert";
import Transform from "./transform";

export default class Eval extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Eval);
  }

  match(object, parents) {
    return (
      isFunction(object) &&
      object.type != "ArrowFunctionExpression" &&
      !object.$eval
    );
  }

  transform(object, parents) {
    if (
      !ComputeProbabilityMap(
        this.options.eval,
        (x) => x,
        object.id && object.id.name
      )
    ) {
      return;
    }

    object.$eval = () => {
      var name;
      if (object.type == "FunctionDeclaration") {
        name = object.id.name;
        object.type = "FunctionExpression";
        object.id = null;
      }

      var code = compileJsSync(object, this.options);
      if (object.type == "FunctionExpression") {
        code = "(" + code + ")";
      }

      var literal = Literal(code);

      var expr: Node = CallExpression(Identifier("eval"), [literal]);
      if (name) {
        expr = VariableDeclaration(VariableDeclarator(name, expr));
      }

      this.replace(object, expr);
    };
  }
}
