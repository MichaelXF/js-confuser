/**
 * The file contains all preparation transformations
 */
import Transform, { reservedIdentifiers } from "../transform";

import {
  BlockStatement,
  Identifier,
  LabeledStatement,
  Literal,
  Node,
  ReturnStatement,
} from "../../util/gen";
import { ObfuscateOrder } from "../../obfuscator";
import {
  getIndexDirect,
  getContext,
  isContext,
  getBlockBody,
  clone,
} from "../../util/insert";
import { ok } from "assert";
import { getIdentifierInfo } from "../../util/identifiers";
import { isBlock, walk } from "../../traverse";
import Label from "../label";
import { VariableAnalysis } from "../identifier/renameVariables";

/**
 * Devs use shortcuts and its harder to parse.
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
          if (object.body.type == "ReturnStatement") {
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

/**
 * Brings all the function declarations to the top.
 *
 * - This is so the first Identifier traversed to is the definition.
 */
class FunctionsFirst extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return isBlock(object);
  }

  transform(object, parents) {
    return () => {
      var body = getBlockBody(object.body);
      var functionDeclarations: Node[] = [];
      var indices: number[] = [];

      var isTop = true;

      body.forEach((stmt, i) => {
        if (stmt.type == "FunctionDeclaration") {
          if (!isTop) {
            functionDeclarations.unshift(stmt);
            indices.unshift(i);
          }
        } else {
          isTop = false;
        }
      });

      functionDeclarations.forEach((fn, i) => {
        var index = indices[i];
        body.splice(index, 1);
      });

      body.unshift(
        ...functionDeclarations.map((x) => {
          return clone(x);
        })
      );
    };
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

/**
 * Renames variables & removes conflicts.
 *
 * - This helps transformations like `Dispatcher` not replace re-declared identifiers.
 */
class NameConflicts extends Transform {
  declared: Set<string>;
  counts: { [name: string]: number };
  variableAnalysis: VariableAnalysis;

  constructor(o) {
    super(o);

    this.before.push((this.variableAnalysis = new VariableAnalysis(o)));
    this.declared = new Set();
    this.counts = Object.create(null);
  }

  match(object, parents) {
    return isContext(object);
  }

  transform(object, parents) {
    // These properties are added to all context's by VariableAnalysis
    var defined = this.variableAnalysis.defined.get(object);
    var references = this.variableAnalysis.references.get(object);
    var nodes = this.variableAnalysis.nodes.get(object);

    if (!nodes) {
      return;
    }

    if (!defined) {
      return;
    }

    var changing = Object.create(null);

    nodes.forEach(([node, p]) => {
      var name = node.name;

      if (!this.counts[name]) {
        this.counts[name] = 0;
      }
      this.counts[name]++;

      var newName = this.getPlaceholder() + "_" + name;
      if (this.declared.has(name) && !changing[name]) {
        newName = newName + "_conflict_" + this.counts[name];
      }

      // Change
      changing[name] = newName;
    });

    defined.forEach((x) => this.declared.add(x));

    var changes = Object.keys(changing).length;

    if (changes > 0) {
      walk(object, parents, (o, p) => {
        var chain = [o, ...p];

        if (isContext(o)) {
          var thisNodes = this.variableAnalysis.nodes.get(o);

          if (thisNodes) {
            var contexts = chain.filter((x) => isContext(x));
            thisNodes.forEach(([x, xP]) => {
              var definedAt = contexts.find(
                (y) =>
                  this.variableAnalysis.defined.has(y) &&
                  this.variableAnalysis.defined.get(y).has(x.name)
              );
              if (definedAt === object) {
                if (changing[x.name]) {
                  x.name = changing[x.name];
                }
              }
            });
          }
        }
      });
    }
  }
}

export default class Preparation extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Preparation);

    // this.before.push(new Block(o));
    this.before.push(new Label(o));
    this.before.push(new ExplicitIdentifiers(o));
    // this.before.push(new ExplicitLabel(o));
    this.before.push(new FunctionsFirst(o));
    this.before.push(new ExplicitDeclarations(o));

    if (this.options.renameVariables) {
      this.before.push(new NameConflicts(o));
    }
  }

  match() {
    return false;
  }
}
