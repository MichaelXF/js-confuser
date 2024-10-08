import { ok } from "assert";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import {
  BinaryExpression,
  CallExpression,
  ExpressionStatement,
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

var HashTemplate = new Template(
  `
  var {name} = function(arr) {
    var s = arr.map(x=>x+"").join(''), a = 1, c = 0, h, o;
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
    return (
      object.type == "ArrayExpression" &&
      !parents.find((x) => x.$multiTransformSkip)
    );
  }

  transform(object, parents) {
    return () => {
      if (object.elements.length < 3) {
        // Min: 4 elements
        return;
      }

      function isAllowed(e) {
        return (
          e.type == "Literal" &&
          { number: 1, boolean: 1, string: 1 }[typeof e.value]
        );
      }

      // Only arrays with only literals
      var illegal = object.elements.find((x) => !isAllowed(x));

      if (illegal) {
        return;
      }

      var mapped = object.elements.map((x) => x.value);

      var mode = ComputeProbabilityMap(this.options.shuffle, (x) => x, mapped);
      if (mode) {
        var shift = getRandomInteger(
          1,
          Math.min(60, object.elements.length * 6)
        );

        var expr = Literal(shift);
        var name = this.getPlaceholder();

        if (mode == "hash") {
          var str = mapped.join("");
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

          var shiftedHash = Hash(
            object.elements.map((x) => x.value + "").join("")
          );

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

        var inPlace = false;
        var inPlaceName;
        var inPlaceBody;
        var inPlaceIndex;

        var varDeclarator = parents[0];
        if (varDeclarator.type == "VariableDeclarator") {
          var varDec = parents[2];
          if (varDec.type == "VariableDeclaration" && varDec.kind !== "const") {
            var body = parents[3];
            if (
              varDec.declarations.length == 1 &&
              Array.isArray(body) &&
              varDeclarator.id.type === "Identifier" &&
              varDeclarator.init === object
            ) {
              inPlaceIndex = body.indexOf(varDec);
              inPlaceBody = body;
              inPlace = inPlaceIndex !== -1;
              inPlaceName = varDeclarator.id.name;
            }
          }
        }

        if (mode !== "hash") {
          var varPrefix = this.getPlaceholder();
          code.push(
            new Template(`
            for ( var ${varPrefix}x = 16; ${varPrefix}x%4 === 0; ${varPrefix}x++) {
              var ${varPrefix}z = 0;
              ${
                inPlace ? `${inPlaceName} = ${name}` : name
              } = ${name}.concat((function(){
                ${varPrefix}z++;
                if(${varPrefix}z === 1){
                  return [];
                }

                for( var ${varPrefix}i = ${getRandomInteger(
              5,
              105
            )}; ${varPrefix}i; ${varPrefix}i-- ){
                  ${name}.unshift(${name}.pop());
                }
                return [];
              })());
            }
            `).single()
          );
        }

        code.push(
          ForStatement(
            VariableDeclaration(VariableDeclarator(iName, expr)),
            Identifier(iName),
            UpdateExpression("--", Identifier(iName), false),
            [
              // ${name}.unshift(${name}.pop());
              ExpressionStatement(
                CallExpression(
                  MemberExpression(
                    Identifier(name),
                    Identifier("unshift"),
                    false
                  ),
                  [
                    CallExpression(
                      MemberExpression(
                        Identifier(name),
                        Identifier("pop"),
                        false
                      ),
                      []
                    ),
                  ]
                )
              ),
            ]
          )
        );

        if (inPlace) {
          var varDeclarator = parents[0];
          ok(i != -1);

          inPlaceBody.splice(
            inPlaceIndex + 1,
            0,
            VariableDeclaration(
              VariableDeclarator(name, Identifier(varDeclarator.id.name))
            ),
            ...code
          );
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
      }
    };
  }
}
