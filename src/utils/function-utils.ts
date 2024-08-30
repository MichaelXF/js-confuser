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
