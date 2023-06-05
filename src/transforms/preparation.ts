import Transform from "./transform";

import {
  BlockStatement,
  Identifier,
  LabeledStatement,
  Literal,
  Node,
  ReturnStatement,
} from "../util/gen";
import { ObfuscateOrder } from "../order";
import { clone, getFunction } from "../util/insert";
import { getIdentifierInfo } from "../util/identifiers";
import { isLoop } from "../util/compare";
import { ExitCallback, walk } from "../traverse";

/**
 * Preparation arranges the user's code into an AST the obfuscator can easily transform.
 *
 * ExplicitIdentifiers
 * - `object.IDENTIFIER` -> `object['IDENTIFIER']` // Now String Concealing can apply on it
 * - `{ IDENTIFIER: ... }` -> `{ "IDENTIFIER": ... }`
 *
 * ExplicitDeclarations
 * - `var a,b,c` -> `var a; var b; var c;` // Now Stack can apply on it
 *
 * Block
 * - `x => x * 2` -> `x => { return x * 2 }` // Change into Block Statements
 * - `if(true) return` -> `if (true) { return }`
 * - `while(a) a--;` -> `while(a) { a-- }`
 *
 * Label
 * - `for(...) { break; }` -> `_1: for(...) { break _1; }`
 * - `switch(v) { case 1...break }` -> `_2: switch(v) { case 1...break _2; }`
 * - // Control Flow Flattening can safely apply now
 */
export default class Preparation extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Preparation);
  }

  match(object: Node, parents: Node[]) {
    return !!object.type;
  }

  transform(object: Node, parents: Node[]): void | ExitCallback {
    // ExplicitIdentifiers
    if (object.type === "Identifier") {
      return this.transformExplicitIdentifiers(object, parents);
    }

    // ExplicitDeclarations
    if (object.type === "VariableDeclaration") {
      return this.transformExplicitDeclarations(object, parents);
    }

    // Block
    switch (object.type) {
      /**
       * People use shortcuts and its harder to parse.
       *
       * - `if (a) b()` -> `if (a) { b() }`
       * - Ensures all bodies are `BlockStatement`, not individual expression statements
       */
      case "IfStatement":
        if (object.consequent.type != "BlockStatement") {
          object.consequent = BlockStatement([clone(object.consequent)]);
        }
        if (object.alternate && object.alternate.type != "BlockStatement") {
          object.alternate = BlockStatement([clone(object.alternate)]);
        }
        break;

      case "WhileStatement":
      case "WithStatement":
      case "ForStatement":
      case "ForOfStatement":
      case "ForInStatement":
        if (object.body.type != "BlockStatement") {
          object.body = BlockStatement([clone(object.body)]);
        }
        break;

      case "ArrowFunctionExpression":
        if (object.body.type !== "BlockStatement" && object.expression) {
          object.body = BlockStatement([ReturnStatement(clone(object.body))]);
          object.expression = false;
        }
        break;
    }

    // Label
    if (
      isLoop(object) ||
      (object.type == "BlockStatement" &&
        parents[0] &&
        parents[0].type == "LabeledStatement" &&
        parents[0].body === object)
    ) {
      return this.transformLabel(object, parents);
    }
  }

  /**
   * Ensures every break; statement has a label to point to.
   *
   * This is because Control Flow Flattening adds For Loops which label-less break statements point to the nearest,
   * when they actually need to point to the original statement.
   */
  transformLabel(object: Node, parents: Node[]) {
    return () => {
      var currentLabel =
        parents[0].type == "LabeledStatement" && parents[0].label.name;

      var label = currentLabel || this.getPlaceholder();

      walk(object, parents, (o, p) => {
        if (o.type == "BreakStatement" || o.type == "ContinueStatement") {
          function isContinuableStatement(x) {
            return isLoop(x) && x.type !== "SwitchStatement";
          }
          function isBreakableStatement(x) {
            return isLoop(x) || (o.label && x.type == "BlockStatement");
          }

          var fn =
            o.type == "ContinueStatement"
              ? isContinuableStatement
              : isBreakableStatement;

          var loop = p.find(fn);
          if (object == loop) {
            if (!o.label) {
              o.label = Identifier(label);
            }
          }
        }
      });

      // Append label statement as this loop has none
      if (!currentLabel) {
        this.replace(object, LabeledStatement(label, { ...object }));
      }
    };
  }

  /**
   * Transforms Identifiers (a.IDENTIFIER, {IDENTIFIER:...}) into string properties
   */
  transformExplicitIdentifiers(object: Node, parents: Node[]) {
    // Mark functions containing 'eval'
    // Some transformations avoid functions that have 'eval' to not break them
    if (object.name === "eval") {
      var fn = getFunction(object, parents);
      if (fn) {
        fn.$requiresEval = true;
      }
    }

    var info = getIdentifierInfo(object, parents);
    if (info.isPropertyKey || info.isAccessor) {
      var propIndex = parents.findIndex(
        (x) => x.type == "MethodDefinition" || x.type == "Property"
      );

      // Don't change constructor!
      if (propIndex !== -1) {
        if (
          parents[propIndex].type == "MethodDefinition" &&
          parents[propIndex].kind == "constructor"
        ) {
          return;
        }
      }

      this.replace(object, Literal(object.name));
      parents[0].computed = true;
      parents[0].shorthand = false;
    }
  }

  /**
   * Transforms VariableDeclaration into single declarations.
   */
  transformExplicitDeclarations(object: Node, parents: Node[]) {
    // for ( var x in ... ) {...}
    var forIndex = parents.findIndex(
      (x) => x.type == "ForInStatement" || x.type == "ForOfStatement"
    );
    if (
      forIndex != -1 &&
      parents[forIndex].left == (parents[forIndex - 1] || object)
    ) {
      object.declarations.forEach((x) => {
        x.init = null;
      });
      return;
    }

    var body = parents[0];
    if (isLoop(body) || body.type == "LabeledStatement") {
      return;
    }

    if (body.type == "ExportNamedDeclaration") {
      return;
    }

    if (!Array.isArray(body)) {
      this.error(new Error("body is " + body.type));
    }

    if (object.declarations.length > 1) {
      // Make singular

      var index = body.indexOf(object);
      if (index == -1) {
        this.error(new Error("index is -1"));
      }

      var after = object.declarations.slice(1);

      body.splice(
        index + 1,
        0,
        ...after.map((x) => {
          return {
            type: "VariableDeclaration",
            declarations: [clone(x)],
            kind: object.kind,
          };
        })
      );

      object.declarations.length = 1;
    }
  }
}
