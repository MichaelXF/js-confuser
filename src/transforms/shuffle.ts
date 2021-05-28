import { ok } from "assert";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import {
  CallExpression,
  ForStatement,
  FunctionExpression,
  Identifier,
  Literal,
  ReturnStatement,
  UpdateExpression,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { clone } from "../util/insert";
import { getRandomInteger } from "../util/random";
import Transform from "./transform";

/**
 * Shuffles arrays initial order of elements.
 *
 * "Un-shuffles" the array at runtime.
 */
export default class Shuffle extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Shuffle);
  }

  match(object, parents) {
    return object.type == "ArrayExpression";
  }

  transform(object, parents) {
    if (object.elements.length < 3) {
      // Min: 4 elements
      return;
    }

    // Only arrays with only literals
    var possible = !object.elements.find((x) => x.type != "Literal");

    if (!possible) {
      return;
    }

    if (ComputeProbabilityMap(this.options.shuffle)) {
      return () => {
        var shift = getRandomInteger(
          1,
          Math.min(100, object.elements.length * 6)
        );

        for (var i = 0; i < shift; i++) {
          object.elements.push(object.elements.shift());
        }

        var name = this.getPlaceholder();

        var code = [];

        code.push(
          ForStatement(
            VariableDeclaration(VariableDeclarator("i", Literal(shift))),
            Identifier("i"),
            UpdateExpression("--", Identifier("i"), false),
            [Template(`${name}.unshift(${name}.pop())`).single()]
          )
        );

        if (!code.length) {
          return;
        }

        var inPlace = false;

        var varDeclarator = parents[0];
        if (varDeclarator.type == "VariableDeclarator") {
          var varDec = parents[2];
          ok(varDec.type == "VariableDeclaration");

          var body = parents[3];
          if (varDec.declarations.length == 1 && Array.isArray(body)) {
            inPlace = true;

            var i = body.indexOf(varDec);
            ok(i != -1);

            body.splice(
              i + 1,
              0,
              VariableDeclaration(
                VariableDeclarator(name, Identifier(varDeclarator.id.name))
              ),
              ...code
            );
          }
        }

        if (!inPlace) {
          this.replace(
            object,
            CallExpression(
              FunctionExpression(
                [Identifier(name)],
                [...code, ReturnStatement(Identifier(name))]
              ),
              [clone(object)]
            )
          );
        }
      };
    }
  }
}
