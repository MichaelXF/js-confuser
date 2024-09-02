import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { variableFunctionName } from "../constants";

export function isFunctionStrictMode(path: NodePath<t.Function>) {
  if (
    t.isBlockStatement(path.node.body) &&
    path.node.body.directives.some(
      (directive) => directive.value.value === "use strict"
    )
  ) {
    return true;
  }

  return false;
}

/**
 * @example __JS_CONFUSER_VAR__(identifier) // true
 * @param path
 * @returns
 */
export function isVariableFunctionIdentifier(path: NodePath<t.Node>) {
  if (path.isIdentifier() && path.parentPath?.isCallExpression()) {
    const callee = path.parentPath.get("callee");
    return callee.isIdentifier({ name: variableFunctionName });
  }

  return false;
}

/**
 * Computes the `function.length` property given the parameter nodes.
 *
 * @example function abc(a, b, c = 1, ...d) {} // abc.length = 2
 */
export function computeFunctionLength(fnPath: NodePath<t.Function>): number {
  var count = 0;

  for (var parameterNode of fnPath.node.params) {
    if (
      parameterNode.type === "Identifier" ||
      parameterNode.type === "ObjectPattern" ||
      parameterNode.type === "ArrayPattern"
    ) {
      count++;
    } else {
      break;
    }
  }

  return count;
}
