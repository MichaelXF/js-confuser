import { ok } from "assert";
import { isBlock } from "../traverse";
import { Node } from "./gen";

export function isLexicalScope(object: Node) {
  return isBlock(object) || object.type == "SwitchCase";
}

export function getLexicalScope(object: Node, parents: Node[]): Node {
  return [object, ...parents].find((node) => isLexicalScope(node));
}

export function getLexicalScopeBody(object: Node): Node[] {
  ok(isLexicalScope(object));

  return isBlock(object)
    ? object.body
    : object.type === "SwitchCase"
    ? object.consequent
    : ok("Unhandled case");
}
