import { ok } from "assert";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import {
  BinaryExpression,
  CallExpression,
  ForStatement,
  FunctionExpression,
  Identifier,
  Literal,
  MemberExpression,
  ReturnStatement,
  UpdateExpression,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { clone, prepend } from "../util/insert";
import { getRandomInteger } from "../util/random";
import Transform from "./transform";

var Hash = function (s) {
  var a = 1,
    c = 0,
    h,
    o;
  if (s) {
    a = 0;
    for (h = s.length - 1; h >= 0; h--) {
      o = s.charCodeAt(h);
      a = ((a << 6) & 268435455) + o + (o << 14);
      c = a & 266338304;
      a = c !== 0 ? a ^ (c >> 21) : a;
    }
  }
  return ~~String(a).slice(0, 3);
};

var HashTemplate = Template(
  `
  var {name} = function(arr) {
    var s = arr.join(''), a = 1, c = 0, h, o;
    if (s) {
        a = 0;
        for (h = s.length - 1; h >= 0; h--) {
            o = s.charCodeAt(h);
            a = (a<<6&268435455) + o + (o<<14);
            c = a & 266338304;
            a = c!==0?a^c>>21:a;
        }
    }
    return ~~String(a).slice(0, 3);
};`
);

/**
 * Shuffles arrays initial order of elements.
 *
 * "Un-shuffles" the array at runtime.
 */
export default class Shuffle extends Transform {
  hashName: string;
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

    var mode = ComputeProbabilityMap(
      this.options.shuffle,
      (x) => x,
      object.elements
    );
    if (mode) {
      return () => {
        var shift = getRandomInteger(
          1,
          Math.min(100, object.elements.length * 6)
        );

        var expr = Literal(shift);
        var name = this.getPlaceholder();

        if (mode == "hash") {
          var str = object.elements.map((x) => x.value).join("");
          shift = Hash(str);

          if (!this.hashName) {
            prepend(
              parents[parents.length - 1],
              HashTemplate.single({
                name: (this.hashName = this.getPlaceholder()),
              })
            );
          }

          for (var i = 0; i < shift; i++) {
            object.elements.push(object.elements.shift());
          }

          var shiftedHash = Hash(object.elements.map((x) => x.value).join(""));

          expr = BinaryExpression(
            "-",
            CallExpression(Identifier(this.hashName), [Identifier(name)]),
            Literal(shiftedHash - shift)
          );
        } else {
          for (var i = 0; i < shift; i++) {
            object.elements.push(object.elements.shift());
          }
        }

        var code = [];

        var iName = this.getPlaceholder();
        code.push(
          ForStatement(
            VariableDeclaration(VariableDeclarator(iName, expr)),
            Identifier(iName),
            UpdateExpression("--", Identifier(iName), false),
            [Template(`${name}.unshift(${name}.pop())`).single()]
          )
        );

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
