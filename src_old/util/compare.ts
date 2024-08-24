import { walk } from "../traverse";
import { Node } from "./gen";
import { getBlockBody, isFunction } from "./insert";

export function isEquivalent(first: Node, second: Node) {
  var extra = {
    start: 1,
    end: 1,
    loc: 1,
  };

  function removeExtra(obj) {
    if (typeof obj === "object") {
      for (var property in obj) {
        if (obj && obj.hasOwnProperty(property)) {
          if (typeof obj[property] == "object") {
            removeExtra(obj[property]);
          } else {
            if (extra[property]) {
              delete obj[property];
            }
          }
        }
      }
    }

    return obj;
  }
  return (
    JSON.stringify(removeExtra(first)) == JSON.stringify(removeExtra(second))
  );
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

export function isValidIdentifier(name: string): boolean {
  if (typeof name !== "string") {
    return false;
  }
  if (name.includes(".") || name.includes(" ")) {
    return false;
  }

  var x = name.match(/^[A-Za-z$_][A-Za-z0-9$_]*/);
  return !!(x && x[0] == name);
}

export function isInsideType(
  type: string,
  object: Node,
  parents: Node[]
): boolean {
  return [object, ...parents].some((x) => x.type == type);
}

export function isDirective(object: Node, parents: Node[]) {
  var dIndex = parents.findIndex((x) => x.directive);
  if (dIndex == -1) {
    return false;
  }

  return parents[dIndex].expression == (parents[dIndex - 1] || object);
}

export function isModuleSource(object: Node, parents: Node[]) {
  if (!parents[0]) {
    return false;
  }

  if (parents[0].type == "ImportDeclaration" && parents[0].source == object) {
    return true;
  }

  if (parents[0].type == "ImportExpression" && parents[0].source == object) {
    return true;
  }

  if (
    parents[1] &&
    parents[1].type == "CallExpression" &&
    parents[1].arguments[0] === object &&
    parents[1].callee.type == "Identifier"
  ) {
    if (
      parents[1].callee.name == "require" ||
      parents[1].callee.name == "import"
    ) {
      return true;
    }
  }

  return false;
}

export function isMoveable(object: Node, parents: Node[]) {
  return !isDirective(object, parents) && !isModuleSource(object, parents);
}

export function isIndependent(object: Node, parents: Node[]) {
  if (object.type == "Literal") {
    return true;
  }

  if (object.type == "Identifier") {
    if (primitiveIdentifiers.has(object.name)) {
      return true;
    }

    var parent = parents[0];
    if (parent && parent.type == "Property") {
      if (!parent.computed && parent.key == object) {
        return true;
      }
    }

    return false;
  }

  if (
    object.type == "ArrayExpression" ||
    object.type == "ObjectExpression" ||
    object.type == "Property"
  ) {
    var allowIt = true;
    walk(object, parents, ($object, $parents) => {
      if (object != $object) {
        if (!Array.isArray($object) && !isIndependent($object, $parents)) {
          allowIt = false;
          return "EXIT";
        }
      }
    });

    return allowIt;
  }

  return false;
}

var primitiveIdentifiers = new Set(["undefined", "NaN"]);

/**
 * booleans, numbers, string, null, undefined, NaN, infinity
 *
 * Types:
 * - `Literal` with typeof `node.value` = `"number" | "string" | "boolean"`
 * - `Identifier` with `name` = `"undefined" | "NaN"`
 *
 *
 * @param node
 * @returns
 */
export function isPrimitive(node: Node) {
  if (node.type == "Literal") {
    if (node.value === null) {
      return true;
    } else if (typeof node.value === "number") {
      return true;
    } else if (typeof node.value === "string") {
      return true;
    } else if (typeof node.value === "boolean") {
      return true;
    }
  } else if (node.type == "Identifier") {
    return primitiveIdentifiers.has(node.name);
  }

  return false;
}
