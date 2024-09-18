import * as t from "@babel/types";
import { ok } from "assert";

export type LiteralValue = string | number | boolean | undefined | null;
export const createLiteral = (value: LiteralValue) => {
  if (value === null) return t.nullLiteral();
  if (value === undefined) return t.identifier("undefined");

  switch (typeof value) {
    case "string":
      return t.stringLiteral(value);

    case "number":
      return numericLiteral(value);

    case "boolean":
      return t.booleanLiteral(value);
  }

  ok(false);
};

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

    Object.getOwnPropertyNames(obj).forEach((key) => {
      const value = obj[key];
      clonedObj[key] = deepClone(value);
    });

    // Copy simple symbols (Avoid objects = infinite recursion)
    Object.getOwnPropertySymbols(obj).forEach((symbol) => {
      const value = obj[symbol];
      if (typeof value !== "object") {
        clonedObj[symbol] = deepClone(value);
      }
    });

    return clonedObj;
  }

  return deepClone(node);
}
