import { ok } from "assert";
import { getBlock, isBlock, getBlocks } from "../traverse";
import { Node, Location } from "./gen";
import { getIdentifierInfo, validateChain } from "./identifiers";

/**
 * - `FunctionDeclaration`
 * - `FunctionExpression`
 * - `ArrowFunctionExpression`
 * @param object
 * @returns
 */
export function isFunction(object: Node): boolean {
  return [
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
  ].includes(object.type);
}

/**
 * The function context where the object is.
 *
 * - Determines if async context.
 * - Determines variable context.
 *
 * @param object
 * @param parents
 */
export function getFunction(object: Node, parents: Node[]): Node {
  return parents.find((x) => isFunction(x));
}

/**
 * Refers to the current function or Root node
 * @param parents
 */
export function getVarContext(object: Node, parents: Node[]): Node {
  var fn = getFunction(null, parents);
  if (fn) {
    return fn;
  }

  var top = parents[parents.length - 1];

  if (top) {
    ok(
      top.type == "Program",
      "Should be Program found " +
        top.type +
        " (" +
        parents
          .map((x) =>
            x.type || Array.isArray(x) ? "<array>" : "<" + typeof x + ">"
          )
          .join(", ") +
        " parents, " +
        (object && object.type) +
        " object)"
    );

    return top;
  }

  ok(object, "No parents and no object");

  return object;
}

/**
 * `Function` or root node
 * @param object
 * @returns
 */
export function isVarContext(object: Node) {
  return (
    isFunction(object) ||
    object.type == "Program" ||
    object.type == "DoExpression"
  ); // Stage 1
}

/**
 * `Block` or root node
 * @param object
 * @returns
 */
export function isLexContext(object: Node): boolean {
  return isBlock(object) || object.type == "Program";
}

export function isThisContext(object: Node): boolean {
  return (
    object.type == "FunctionDeclaration" ||
    object.type == "FunctionExpression" ||
    object.type == "Program"
  );
}

/**
 * Either a `var context` or `lex context`
 * @param object
 * @returns
 */
export function isContext(object: Node): boolean {
  return isVarContext(object) || isLexContext(object);
}

export function getContexts(object: Node, parents: Node[]): Node[] {
  return [object, ...parents].filter((x) => isContext(x));
}

/**
 * Refers to the current lexical block or Root node.
 * @param parents
 */
export function getLexContext(object: Node, parents: Node[]): Node {
  var block = getBlock(null, parents);
  if (block) {
    return block;
  }

  var top = parents[parents.length - 1];

  if (top) {
    ok(
      top.type == "Program",
      "Should be Program found " +
        top.type +
        " (" +
        parents
          .map((x) =>
            x.type || Array.isArray(x) ? "<array>" : "<" + typeof x + ">"
          )
          .join(", ") +
        " parents, " +
        (object && object.type) +
        " object)"
    );

    return top;
  }

  ok(object, "No parents and no object");

  return object;
}

export function getDefiningContext(o: Node, p: Node[]): Node {
  validateChain(o, p);
  ok(o.type == "Identifier");
  var info = getIdentifierInfo(o, p);

  ok(info.spec.isDefined);

  if (info.isVariableDeclaration) {
    var variableDeclaration = p.find((x) => x.type == "VariableDeclaration");
    ok(variableDeclaration);

    if (variableDeclaration.kind === "let") {
      return getLexContext(o, p);
    }
  }

  if (info.isFunctionDeclaration) {
    return getVarContext(p[0], p.slice(1));
  }

  return getVarContext(o, p);
}

export function getBlockBody(block: Node): Node[] {
  if (!block) {
    throw new Error("no block body");
  }
  if (Array.isArray(block)) {
    return block;
  }
  return getBlockBody(block.body);
}

/**
 * Returns a human readable path.
 * - Example: `Program.anonymous.Rectangle.Rectangle#getVolume`
 * @param object
 * @param parents
 */
export function getBlockPathName(object: Node, parents: Node[]): string {
  return getBlockPathArray(object, parents)
    .reverse()
    .join(".")
    .replace("<root>.<root>", "<root>");
}

/**
 * ["NestedFunction", "MainFunction", "Program"].
 * - See **`getBlockPathName`** for a human readable version.
 * @param object
 * @param parents
 */
export function getBlockPathArray(object: Node, parents: Node[]): string[] {
  var list = [object, ...parents];
  var path = [];

  for (var i = 0; i < list.length; i++) {
    if (isBlock(list[i])) {
      var nObject = list[i];
      var nParents = list.slice(i + 1);

      path.push(getBlockName(nObject, nParents));
    }
  }

  return path;
}

export function getBlockName(object: Node, parents: Node[]): string {
  var list = [object, ...parents];

  var idName = new Set([
    "FunctionDeclaration",
    "VariableDeclarator",
    "ClassDeclaration",
  ]);
  var types = {
    WhileStatement: "<while>",
    DoWhileStatement: "<do while>",
    TryStatement: "<try>",
    ForStatement: "<for>",
    ForInStatement: "<for in>",
    ForOfStatement: "<for of>",
    CatchClause: "<catch>",
    ThrowStatement: "<throw>",
    IfStatement: "<if>",
    DoStatement: "<do>",
  };
  for (var i = 0; i < list.length; i++) {
    var node = list[i];
    var next = list[i + 1];

    if (types[node.type]) {
      return types[node.type];
    }

    if (
      node.type == "BlockStatement" &&
      list[i + 1].type == "TryStatement" &&
      list[i + 1].finalizer == node
    ) {
      return "<finally>";
    }

    if (next && next.alternate == node) {
      if (node.type == "IfStatement") {
        return "<else-if>";
      }
      return "<else>";
    }

    // Function calling
    if (node.type == "FunctionExpression") {
      // iife
      if (next) {
        if (next.type == "ExpressionStatement") {
          return "anonymous";
        }
        // callbacks
        if (next.type == "CallExpression") {
          var callee = next.callee;
          if (callee.name) {
            return callee.name;
          }
          return "(intermediate value)";
        }
        if (next.type == "AssignmentExpression") {
          if (next.left.type == "MemberExpression") {
            var r = next.left.object.name;
            if (next.left.object.type == "ThisExpression") {
              r = "this";
            }
            if (next.left.object.type == "SuperExpression") {
              r = "super";
            }
            return (
              r + "." + (next.left.property.value || next.left.property.name)
            );
          }
        }
      }

      return "function()";
    }

    if (node.type == "MethodDefinition") {
      var className = parents.find((x) => x.type == "ClassDeclaration").id.name;

      return (
        className +
        "#" +
        node.key.name +
        (["set", "get"].includes(node.kind) ? "[" + node.kind + "]" : "")
      );
    }

    if (idName.has(node.type)) {
      return node.id.name;
    }

    if (node.type == "Program") {
      return i == list.length - 1 ? "<root>" : "<block>";
    }
  }

  return "";
}

export function getIndexAndBlock(
  object: Node,
  parents: Node[]
): { block: Node; index: number } {
  var index, block;
  var search = [object, ...parents];
  var last = object;

  for (var i = 0; i < search.length; i++) {
    if (isBlock(search[i])) {
      block = search[i];
      index = getBlockBody(block).findIndex((x) => x == last);

      break;
    }

    last = search[i];
  }

  return {
    block: block,
    index: index,
  };
}

export function getIndexDirect(object: Node, parent: Node[]): string {
  return Object.keys(parent).find((x) => parent[x] == object);
}

/**
 * Attempts to a delete a variable/functions declaration.
 * @param object
 * @param parents
 */
export function deleteDeclaration(object: Node, parents: Node[]) {
  validateChain(object, parents);

  // variables
  var list = [object, ...parents];

  var declaratorIndex = list.findIndex((x) => x.type == "VariableDeclarator");
  if (declaratorIndex != -1) {
    var declarator = list[declaratorIndex]; // {type: VariableDeclarator, id: Identifier, init: Literal|Expression...}
    var declarations = list[declaratorIndex + 1]; // declarator[]
    var VariableDeclaration = list[declaratorIndex + 2];
    var body = list[declaratorIndex + 3];

    deleteDirect(declarator, declarations);

    if (VariableDeclaration.declarations.length == 0) {
      deleteDirect(VariableDeclaration, body);
    }
  } else {
    if (object.type != "FunctionDeclaration") {
      throw new Error("No method to delete: " + object.type);
    }

    deleteDirect(object, parents[0]);
  }
}

/**
 * Object must be directly nested in parent
 */
export function deleteDirect(object: Node, parent: Node) {
  if (!object) {
    throw new Error("object undefined");
  }

  if (!parent) {
    throw new Error("parent undefined");
  }

  validateChain(object, [parent]);

  if (typeof parent === "object") {
    if (Array.isArray(parent)) {
      var index = parent.indexOf(object);
      if (index != -1) {
        // delete
        parent.splice(index, 1);
      } else {
        console.log("parent=", parent);
        console.log("object=", object);
        throw new Error("index -1");
      }
    } else {
      var keyName = Object.keys(parent).find((x) => parent[x] == object);

      if (keyName) {
        delete parent[keyName];
      } else {
        throw new Error("keyName undefined");
      }
    }
  }
}

export function replace(object, parents, newObject) {
  // todo key based on body
  Object.assign(newObject, object);
}

export function prepend(block: Node, ...nodes: Node[]) {
  ok(!Array.isArray(block), "block should not be array");

  if (block.type == "Program") {
    var decs = 0;
    block.body.forEach((stmt, i) => {
      if (stmt.type == "ImportDeclaration") {
        if (decs == i) {
          decs++;
        }
      }
    });

    block.body.splice(decs, 0, ...nodes);
  } else {
    getBlockBody(block).unshift(...nodes);
  }
}

export function append(block: Node, ...nodes: Node[]) {
  getBlockBody(block).push(...nodes);
}

export function insertBefore(object: Node, parents: Node[], node: Node) {
  var { block, index } = getIndexAndBlock(object, parents);

  getBlockBody(block).splice(index, 0, node);
}

export function insertAfter(object: Node, parents: Node[], node: Node) {
  var { block, index } = getIndexAndBlock(object, parents);

  getBlockBody(block).splice(index + 1, 0, node);
}

export function clone<T>(object: T): T {
  if (typeof object === "object" && object) {
    if (Array.isArray(object)) {
      var newArray = [] as unknown as any;
      object.forEach((element) => {
        newArray.push(clone(element));
      });

      return newArray;
    } else {
      var newObject = {} as T;

      Object.keys(object).forEach((key) => {
        if (!(key + "").startsWith("$")) {
          newObject[key] = clone(object[key]);
        }
      });

      return newObject;
    }
  }

  return object as any;
}

export function isForInitialize(o, p) {
  validateChain(o, p);

  var forIndex = p.findIndex((x) => x.type == "ForStatement");
  var inFor = forIndex != -1 && p[forIndex].init == (p[forIndex - 1] || o);

  if (!inFor) {
    var forCustomIndex = p.findIndex(
      (x) => x.type == "ForInStatement" || x.type == "ForOfStatement"
    );

    inFor =
      forCustomIndex != -1 &&
      p[forCustomIndex].left == (p[forCustomIndex - 1] || o);
  }

  return inFor;
}

export function isInBranch(object: Node, parents: Node[], context: Node) {
  ok(object);
  ok(parents);
  ok(context);

  ok(parents.includes(context));

  var definingContext =
    parents[0].type == "FunctionDeclaration" && parents[0].id == object
      ? getVarContext(parents[0], parents.slice(1))
      : getVarContext(object, parents);

  var contextIndex = parents.findIndex((x) => x === context);
  var slicedParents = parents.slice(0, contextIndex);

  ok(!slicedParents.includes(object), "slicedParents includes object");

  var slicedTypes = new Set(slicedParents.map((x) => x.type));

  var isBranch = definingContext !== context;
  if (!isBranch) {
    if (
      [
        "IfStatement",
        "ForStatement",
        "ForInStatement",
        "ForOfStatement",
        "WhileStatement",
        "DoWhileStatement",
        "SwitchStatement",
        "ConditionalExpression",
        "LogicalExpression",
        "TryStatement",
        "ChainExpression",
      ].find((x) => slicedTypes.has(x))
    ) {
      isBranch = true;
    }
  }

  return isBranch;
}
