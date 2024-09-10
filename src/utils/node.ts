import * as t from "@babel/types";
import { ok } from "assert";

/**
 * Handles both positive and negative numeric literals
 * @param value
 * @returns
 */
export function numericLiteral(
  value: number
): t.NumericLiteral | t.UnaryExpression {
  ok(typeof value === "number");

  if (value < 0) {
    return t.unaryExpression("-", t.numericLiteral(-value));
  }
  return t.numericLiteral(value);
}
