import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

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
