import Transform from "../transform";
import {
  Node,
  Literal,
  Identifier,
  MemberExpression,
  BlockStatement,
  ReturnStatement,
  CallExpression,
  ThisExpression,
} from "../../util/gen";
import { clone, prepend } from "../../util/insert";
import { isBlock, walk } from "../../traverse";
import { ObfuscateOrder } from "../../order";
import { ok } from "assert";
import { reservedKeywords } from "../../constants";
import AntiDestructuring from "./antiDestructuring";
import AntiTemplate from "./antiTemplate";
import AntiClass from "./antiClass";
import AntiES6Object from "./antiES6Object";
import AntiSpreadOperator from "./antiSpreadOperator";
import { ES5Template } from "../../templates/es5";

/**
 * `Const` and `Let` are not allowed in ES5.
 */
class AntiConstLet extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type == "VariableDeclaration" && object.kind != "var";
  }

  transform(object) {
    object.kind = "var";
  }
}

/**
 * Converts arrow functions
 */
export class AntiArrowFunction extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type == "ArrowFunctionExpression";
  }

  transform(object, parents) {
    return () => {
      var usesThis = false;

      if (object.body.type != "BlockStatement" && object.expression) {
        object.body = BlockStatement([ReturnStatement(clone(object.body))]);
        object.expression = false;
      }

      walk(object.body, [object, ...parents], (o, p) => {
        if (p.filter((x) => isBlock(x))[0] == object.body) {
          if (
            o.type == "ThisExpression" ||
            (o.type == "Identifier" && o.name == "this")
          ) {
            usesThis = true;
          }
        }
      });

      ok(object.body.type == "BlockStatement", "Should be a BlockStatement");
      ok(Array.isArray(object.body.body), "Body should be an array");
      ok(
        !object.body.body.find((x) => Array.isArray(x)),
        "All elements should be statements"
      );

      object.type = "FunctionExpression";
      object.expression = false;

      if (usesThis) {
        this.objectAssign(
          object,
          CallExpression(
            MemberExpression(clone(object), Identifier("bind"), false),
            [ThisExpression()]
          )
        );
      }
    };
  }
}

/**
 * The ES5 options aims to convert ES6 and up features down to ES5-compatible code.
 *
 * The obfuscator regularly adds ES6 code (variable destructuring, spread element, etc.)
 * This transformations goal is undo only these things.
 */
export default class ES5 extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.ES5);

    this.before.push(new AntiClass(o));
    this.before.push(new AntiTemplate(o));
    this.before.push(new AntiSpreadOperator(o));
    this.before.push(new AntiES6Object(o));
    this.before.push(new AntiArrowFunction(o));
    this.before.push(new AntiDestructuring(o));
    this.before.push(new AntiConstLet(o));
  }

  apply(tree: Node) {
    super.apply(tree);

    var nodesToAdd = ES5Template.compile();
    prepend(tree, ...nodesToAdd);
  }

  // FixedExpressions
  match(object: Node, parents: Node[]) {
    return !!object.type;
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      // Object.keyword -> Object["keyword"]
      if (object.type == "MemberExpression") {
        if (!object.computed && object.property.type == "Identifier") {
          if (reservedKeywords.has(object.property.name)) {
            object.property = Literal(object.property.name);
            object.computed = true;
          }
        }
      }

      // { keyword: ... } -> { "keyword": ... }
      if (object.type == "Property") {
        if (!object.computed && object.key.type == "Identifier") {
          if (reservedKeywords.has(object.key.name)) {
            object.key = Literal(object.key.name);
          }
        }
      }
    };
  }
}
