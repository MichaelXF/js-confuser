/**
 * The file contains all preparation transformations
 */
import Transform from "../transform";

import {
  BlockStatement,
  Identifier,
  LabeledStatement,
  Literal,
  Location,
  Node,
  ReturnStatement,
} from "../../util/gen";
import { ObfuscateOrder } from "../../order";
import {
  getIndexDirect,
  getVarContext,
  isVarContext,
  getBlockBody,
  clone,
} from "../../util/insert";
import { ok } from "assert";
import { getIdentifierInfo } from "../../util/identifiers";
import { isBlock, walk } from "../../traverse";
import Label from "../label";
import { VariableAnalysis } from "../identifier/renameVariables";
import NameConflicts from "./nameConflicts";
import AntiDestructuring from "../es5/antiDestructuring";
import { OPERATOR_PRECEDENCE } from "../../precedence";

/**
 * People use shortcuts and its harder to parse.
 *
 * - `if (a) b()` -> `if (a) { b() }`
 * - Ensures all bodies are `BlockStatement`, not individual expression statements
 */
class Block extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return !Array.isArray(object);
  }

  transform(object, parents) {
    switch (object.type) {
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
        if (object.body.type != "BlockStatement") {
          if (!object.expression) {
            object.body = BlockStatement([clone(object.body)]);
          } else {
            object.body = BlockStatement([ReturnStatement(clone(object.body))]);
          }
          object.expression = false;
        }
        break;
    }
  }
}

class ExplicitIdentifiers extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type == "Identifier";
  }

  transform(object, parents) {
    var info = getIdentifierInfo(object, parents);
    if (info.isPropertyKey || info.isAccessor || info.isMethodDefinition) {
      this.log(object.name, "->", `'${object.name}'`);

      this.replace(object, Literal(object.name));
      parents[0].computed = true;
      parents[0].shorthand = false;
    }
  }
}

/**
 * Statements that allowed `break;` and `continue;` statements
 * @param object
 */
export function isLoop(object: Node) {
  return [
    "SwitchStatement",
    "WhileStatement",
    "DoWhileStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
  ].includes(object.type);
}

/**
 * Ensures all `break;` and `continue;` are labeled.
 * - Needed for complex CFF.
 */
class ExplicitLabel extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return isLoop(object);
  }

  transform(object, parents) {
    var parent = parents[0];
    if (parent.type != "LabeledStatement") {
      var label = this.getPlaceholder();

      walk(object, parents, (o, p) => {
        var context = p.find((x) => isLoop(x));
        if (context == object) {
          if (o.type == "BreakStatement") {
            if (!o.label) {
              o.label = Identifier(label);
            }
          }
        }
      });

      var index = getIndexDirect(object, parent);
      ok(index !== undefined, "index cannot be undefined");

      this.replace(object, LabeledStatement(label, clone(object)));
    }
  }
}

class ExplicitDeclarations extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type == "VariableDeclaration";
  }

  transform(object, parents) {
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

export class ReOrderNodeKeys extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return object.type;
  }

  apply(tree) {
    // console.log(tree.body[0].expression);

    super.apply(tree);

    // console.log(tree.body[0].expression);
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (object.type == "AssignmentExpression") {
        this.replace(object, {
          type: "AssignmentExpression",
          operator: "=",
          right: object.right,
          left: object.left,
        });

        ok(
          Object.keys(object).indexOf("right") <
            Object.keys(object).indexOf("left")
        );
      } else if (
        object.type == "BinaryExpression" ||
        object.type == "LogicalExpression"
      ) {
        if (
          object.left.type == "BinaryExpression" ||
          object.left.type == "LogicalExpression"
        ) {
          return;
        }

        if (
          object.right.type == "BinaryExpression" ||
          object.right.type == "LogicalExpression"
        ) {
          return;
        }

        var exprs: Location[] = [];
        var i = 0;
        for (var p of parents) {
          if (p.type == "BinaryExpression" || p.type == "LogicalExpression") {
            exprs.push([p, parents.slice(i + 1)]);
          } else {
            break;
          }
          i++;
        }

        if (exprs.length) {
          const chain: Location[] = [[object, parents], ...exprs];

          chain.forEach((location) => {
            location[0].precedence = OPERATOR_PRECEDENCE[location[0].operator];
          });

          chain.forEach((location) => {
            var v = [location[0].precedence];
            function recursive(o) {
              if (o) {
                if (o.precedence) {
                  v.push(o.precedence);

                  recursive(o.left);
                  recursive(o.right);
                }
              }
            }
            recursive(location[0].left);
            recursive(location[0].right);

            var max = v.sort((a, b) => b - a)[0];

            location[0].precedence = max;
          });

          chain.reverse().forEach((location) => {
            var { left, right, operator } = location[0];
            ok(left);
            ok(right);

            var leftPrecedence = left.precedence || 1;
            var rightPrecedence = right.precedence || 1;
            var isRightToLeft = { "**": 1 }[operator];

            if (leftPrecedence === rightPrecedence && !isRightToLeft) {
              return;
            }

            if (
              (!isRightToLeft && leftPrecedence >= rightPrecedence) ||
              (isRightToLeft && leftPrecedence > rightPrecedence)
            ) {
              this.replace(location[0], {
                type: location[0].type,
                operator: operator,
                left: left,
                right: right,
              });
            } else {
              this.replace(location[0], {
                type: location[0].type,
                operator: operator,
                right: right,
                left: left,
              });
            }
          });
        }
      }
    };
  }
}

export default class Preparation extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Preparation);

    this.before.push(new ReOrderNodeKeys(o));
    this.before.push(new Block(o));
    this.before.push(new Label(o));
    this.before.push(new ExplicitIdentifiers(o));
    // this.before.push(new ExplicitLabel(o));
    this.before.push(new ExplicitDeclarations(o));

    if (this.options.es5) {
      this.before.push(new AntiDestructuring(o));
    }

    this.before.push(new NameConflicts(o));
  }

  match() {
    return false;
  }
}
