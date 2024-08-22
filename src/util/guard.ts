import { variableFunctionName } from "../constants";
import { Node } from "./gen";

export function isStringLiteral(node: Node) {
  return (
    node.type === "Literal" && typeof node.value === "string" && !node.regex
  );
}

export function isJSConfuserVar(p: Node[]) {
  return p.find(
    (x) =>
      x.type === "CallExpression" &&
      x.callee.type === "Identifier" &&
      x.callee.name == variableFunctionName
  );
}
