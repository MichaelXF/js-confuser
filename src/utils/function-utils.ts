import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { FN_LENGTH, NodeSymbol, variableFunctionName } from "../constants";

/**
 * @example __JS_CONFUSER_VAR__(identifier) // true
 * @param path
 * @returns
 */
export function isVariableFunctionIdentifier(path: NodePath<t.Node>) {
  if (
    path.isIdentifier() &&
    path.listKey === "arguments" &&
    path.key === 0 &&
    path.parentPath?.isCallExpression()
  ) {
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
  var savedLength = (fnPath.node as NodeSymbol)[FN_LENGTH];
  if (typeof savedLength === "number") {
    return savedLength;
  }

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
