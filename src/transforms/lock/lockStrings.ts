import Template from "../../templates/template";
import {
  ObjectExpression,
  VariableDeclaration,
  VariableDeclarator,
  Identifier,
  FunctionDeclaration,
  MemberExpression,
  Literal,
  ExpressionStatement,
  CallExpression,
  FunctionExpression,
  AssignmentExpression,
  BinaryExpression,
  ReturnStatement,
  ArrayExpression,
  Property,
  Node,
} from "../../util/gen";
import { prepend } from "../../util/insert";
import { getRandomInteger } from "../../util/random";
import Transform from "../transform";

/**
 * Strings are formulated to work only during the allowed time
 */
export default class LockStrings extends Transform {
  strings: { [key: string]: string };
  gen: any;
  fnName: string;
  objectExpression: Node;
  shift: number;

  constructor(o) {
    super(o);

    this.strings = Object.create(null);
    this.gen = this.getGenerator();

    this.fnName = null;
    this.objectExpression = null;

    this.shift = getRandomInteger(1, 5);
  }

  match(object) {
    return (
      object.type == "Program" ||
      (object.type == "Literal" && typeof object.value === "string")
    );
  }

  getKey() {
    function ensureNumber(y: Date | number | false) {
      if (!y) {
        return 0;
      }
      if (y instanceof Date) {
        return y.getTime();
      }

      // @ts-ignore
      return parseInt(y);
    }

    var start = ensureNumber(this.options.lock.startDate);
    var end = ensureNumber(this.options.lock.endDate);

    var diff = end - start;

    var now = Date.now();

    return {
      key: Math.floor(now / diff),
      diff: diff,
    };
  }

  transform(object: Node, parents: Node[]) {
    if (!this.fnName) {
      this.fnName = this.getPlaceholder();

      this.objectExpression = ObjectExpression([]);
    }

    if (object.type == "Program") {
      var keyArg = this.getPlaceholder();
      var mapName = this.getPlaceholder();

      return () => {
        if (this.objectExpression.properties.length) {
          var keyVar = this.getPlaceholder();

          var { diff } = this.getKey();
          prepend(
            object,
            VariableDeclaration([
              VariableDeclarator(
                Identifier(keyVar),
                Template(`Math.floor(Date.now()/${diff})`).single().expression
              ),
            ])
          );

          var currentVar = this.getPlaceholder();
          var outputVar = this.getPlaceholder();
          var xVar = this.getPlaceholder();

          prepend(
            object,
            FunctionDeclaration(
              this.fnName,
              [Identifier(keyArg)],
              [
                VariableDeclaration(
                  VariableDeclarator(mapName, this.objectExpression)
                ),
                VariableDeclaration(
                  VariableDeclarator(
                    currentVar,
                    MemberExpression(
                      Identifier(mapName),
                      Identifier(keyArg),
                      true
                    )
                  )
                ),
                VariableDeclaration(VariableDeclarator(outputVar, Literal(""))),
                ExpressionStatement(
                  CallExpression(
                    MemberExpression(
                      Identifier(currentVar),
                      Identifier("forEach"),
                      false
                    ),
                    [
                      FunctionExpression(
                        [Identifier(xVar)],
                        [
                          ExpressionStatement(
                            AssignmentExpression(
                              "+=",
                              Identifier(outputVar),
                              CallExpression(
                                MemberExpression(
                                  Identifier("String"),
                                  Identifier("fromCharCode"),
                                  false
                                ),
                                [
                                  BinaryExpression(
                                    "^",
                                    BinaryExpression(
                                      ">>",
                                      Identifier(xVar),
                                      Literal(this.shift)
                                    ),
                                    Identifier(keyVar)
                                  ),
                                ]
                              )
                            )
                          ),
                        ]
                      ),
                    ]
                  )
                ),
                ReturnStatement(Identifier(outputVar)),
              ]
            )
          );
        }
      };
    }

    if (!object.value) {
      return;
    }

    if (
      parents.find(
        (x) => x.type == "CallExpression" && x.callee.name == this.fnName
      )
    ) {
      return;
    }

    var key = this.strings[object.value];

    if (!key) {
      // New string found!
      key = this.gen.generate();
      this.strings[key] = object.value;

      var xorKey = this.getKey().key;

      var array = ArrayExpression(
        object.value
          .split("")
          .map((x) => x.charCodeAt(0))
          .map((x) => x ^ xorKey)
          .map((x) => x << this.shift)
          .map((x) => Literal(x))
      );

      this.objectExpression.properties.push(
        Property(Identifier(key), array, false)
      );
    }

    if (parents[0].type == "Property") {
      parents[0].computed = true;
    }

    this.objectAssign(
      object,
      CallExpression(Identifier(this.fnName), [Literal(key)])
    );
  }
}
