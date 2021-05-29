import { ok } from "assert";
import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import Template from "../templates/template";
import traverse, { walk } from "../traverse";
import {
  FunctionDeclaration,
  Identifier,
  ReturnStatement,
  FunctionExpression,
  SwitchStatement,
  VariableDeclaration,
  VariableDeclarator,
  CallExpression,
  MemberExpression,
  ThisExpression,
  ArrayExpression,
  SwitchCase,
  Literal,
  ExpressionStatement,
  BreakStatement,
  AssignmentExpression,
  Location,
  Node,
  BlockStatement,
  SpreadElement,
  ObjectExpression,
  Property,
} from "../util/gen";
import { getDefiningIdentifier, getIdentifierInfo } from "../util/identifiers";
import {
  getBlockBody,
  getVarContext,
  isVarContext,
  isFunction,
  prepend,
} from "../util/insert";
import Transform from "./transform";

/**
 * Brings every function to the global level.
 *
 * Functions take parameters, input, have a return value and return modified changes to the scoped variables.
 *
 * ```js
 * function topLevel(ref1, ref2, refN, param1, param2, paramN){
 *   return [ref1, ref2, refN, returnValue];
 * }
 * ```
 */
export default class Flatten extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Flatten);
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) &&
      getVarContext(parents[0], parents.slice(1)) !==
        parents[parents.length - 1]
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      //
    };
  }
}
