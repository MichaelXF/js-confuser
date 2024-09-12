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

export function deepClone(node: t.Node | t.Node[]) {
  function deepClone(obj) {
    // Handle non-objects like null, undefined, primitive values, or functions
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj);
    }

    // Handle Array
    if (Array.isArray(obj)) {
      return obj.map(deepClone);
    }

    // Handle Objects
    const clonedObj = {};

    // Handle string and symbol property keys
    [
      ...Object.getOwnPropertyNames(obj),
      ...Object.getOwnPropertySymbols(obj),
    ].forEach((key) => {
      const value = obj[key];
      clonedObj[key] = deepClone(value);
    });

    return clonedObj;
  }

  return deepClone(node);
}
