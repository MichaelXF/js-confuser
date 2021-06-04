import Transform from "./transform";
import {
  Node,
  BinaryExpression,
  MemberExpression,
  Identifier,
  CallExpression,
  Literal,
  VariableDeclaration,
  ObjectExpression,
  Property,
  FunctionExpression,
  ArrayExpression,
  LogicalExpression,
  VariableDeclarator,
} from "../util/gen";
import { choice, getRandomInteger, shuffle } from "../util/random";
import { ObfuscateOrder } from "../order";
import { clone, prepend } from "../util/insert";
import Template from "../templates/template";
import { ComputeProbabilityMap } from "../probability";
import { ok } from "assert";

function isTestExpression(object: Node, parents: Node[]) {
  if (!object || !parents[0]) {
    return false;
  }

  if (
    {
      ForStatement: 1,
      WhileStatement: 1,
      DoWhileStatement: 1,
      IfStatement: 1,
      ConditionExpression: 1,
      SwitchCase: 1,
    }[parents[0].type] &&
    parents[0].test === object
  ) {
    return true;
  }

  return false;
}

/**
 * Changes test expression (such as if statements, for loops) to add predicates.
 *
 * Predicates are computed at runtime.
 */
export default class OpaquePredicates extends Transform {
  undefinedVar: string;
  nullVar: string;
  numberVar: string;

  predicateName: string;
  predicate: Node;
  predicates: { [name: string]: Node };

  gen: any;
  made: number;

  constructor(o) {
    super(o, ObfuscateOrder.OpaquePredicates);

    this.predicates = Object.create(null);
    this.gen = this.getGenerator(getRandomInteger(0, 20));
    this.made = 0;
  }

  match(object: Node, parents: Node[]) {
    return (
      isTestExpression(object, parents) &&
      !parents.find((x) => x.$dispatcherSkip)
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (ComputeProbabilityMap(this.options.opaquePredicates)) {
        this.made++;
        if (this.made > 150) {
          return;
        }

        if (!this.predicate) {
          this.predicateName = this.getPlaceholder();
          this.predicate = ObjectExpression([]);
          prepend(
            parents[parents.length - 1] || object,
            VariableDeclaration(
              VariableDeclarator(this.predicateName, this.predicate)
            )
          );
        }

        var expr = choice(Object.values(this.predicates));

        if (
          !expr ||
          Math.random() < 0.5 / (Object.keys(this.predicates).length || 1)
        ) {
          var prop = this.gen.generate();
          var accessor = MemberExpression(
            Identifier(this.predicateName),
            Identifier(prop),
            false
          );
          switch (choice(["array", "number", "string"])) {
            case "array":
              var arrayProp = this.gen.generate();
              this.predicate.properties.push(
                Property(Identifier(arrayProp), ArrayExpression([]))
              );
              this.predicate.properties.push(
                Property(
                  Identifier(prop),
                  FunctionExpression(
                    [],
                    Template(`
                  if ( !${this.predicateName}.${arrayProp}[0] ) {
                    ${this.predicateName}.${arrayProp}.push(${getRandomInteger(
                      -100,
                      100
                    )});
                  }
                  return ${this.predicateName}.${arrayProp}.length;
                `).compile()
                  )
                )
              );
              expr = CallExpression(accessor, []);
              break;

            case "number":
              this.predicate.properties.push(
                Property(Identifier(prop), Literal(getRandomInteger(10, 90)))
              );
              expr = BinaryExpression(
                ">",
                accessor,
                Literal(getRandomInteger(2, 9))
              );
              break;

            case "string":
              var str = this.getPlaceholder();
              var index = getRandomInteger(0, str.length);
              var fn = Math.random() > 0.5 ? "charAt" : "charCodeAt";

              this.predicate.properties.push(
                Property(Identifier(prop), Literal(str))
              );
              expr = BinaryExpression(
                "==",
                CallExpression(MemberExpression(accessor, Literal(fn), true), [
                  Literal(index),
                ]),
                Literal(str[fn](index))
              );
              break;
          }

          ok(expr);
          this.predicates[prop] = expr;

          if (Math.random() > 0.8) {
            shuffle(this.predicate.properties);
          }
        }

        var cloned = clone(expr);

        if (object.type == "Literal" && object.value) {
          this.replace(object, cloned);
        } else {
          this.replace(object, LogicalExpression("&&", clone(object), cloned));
        }
      }
    };
  }
}
