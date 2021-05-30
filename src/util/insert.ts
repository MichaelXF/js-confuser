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
  var fn = getFunction(object, parents);
  if (fn) {
    return fn;
  }

  var top = parents[parents.length - 1] || object;

  if (top) {
    ok(top.type == "Program", "Root node not program, its " + top.type);
    return top;
  }

  throw new Error("Missing root node");
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
  var block = getBlock(object, parents);
  if (block) {
    return block;
  }

  var top = parents[parents.length - 1];
  if (!top) {
    throw new Error("Missing root node");
  }
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

export function getReferencingContexts(o: Node, p: Node[]): Node[] {
  validateChain(o, p);
  ok(o.type == "Identifier");

  var info = getIdentifierInfo(o, p);
  ok(info.spec.isReferenced);

  var assignmentPatternIndex = p.findIndex(
    (x) => x.type == "AssignmentPattern"
  );
  if (assignmentPatternIndex != -1) {
    if (
      p[assignmentPatternIndex].right == (p[assignmentPatternIndex - 1] || o)
    ) {
      var sliced = p.slice(assignmentPatternIndex);
      var fnIndex = sliced.findIndex((x) => isFunction(x));
      var associatedFn = sliced[fnIndex];
      if (
        fnIndex !== -1 &&
        sliced[fnIndex].params == (sliced[fnIndex - 1] || o)
      ) {
        if (associatedFn == getVarContext(o, p)) {
          return isLexContext(associatedFn.body)
            ? [associatedFn, associatedFn.body]
            : [associatedFn];
        }
      }
    }
  }

  return [getVarContext(o, p), getLexContext(o, p)];
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

  var forIndex = p.findIndex(
    (x) =>
      x.type == "ForStatement" ||
      x.type == "ForInStatement" ||
      x.type == "ForOfStatement"
  );
  if (forIndex !== -1) {
    if (p[forIndex].type == "ForStatement") {
      if (p[forIndex].init == p[forIndex - 1] || o) {
        return true;
      }
    } else {
      if (p[forIndex].left == p[forIndex - 1] || o) {
        return true;
      }
    }
  }

  return false;
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
