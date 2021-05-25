import * as assert from "assert";
import { Node } from "./util/gen";

const acorn = require("acorn");

/**
 * Uses `acorn` to parse Javascript Code. Returns an AST tree.
 * @param code
 * @returns
 */
export default async function parseJS(code: string) {
  assert.ok(typeof code === "string", "code must be a string");

  try {
    var parsed = parseSync(code);
    return parsed;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to parse code.");
  }
}

/**
 * Parses a snippet code. Returns an AST Tree.
 * @param code
 * @returns
 */
export function parseSnippet(code: string): Node {
  return acorn.parse(code, {
    ecmaVersion: "latest",
    allowReturnOutsideFunction: true,
    sourceType: "module",
  });
}

/**
 * Parses synchronously. Attempts to parse as a es-module, then fallbacks to a script.
 * @param code
 * @returns
 */
export function parseSync(code): Node {
  try {
    return acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });
  } catch (e) {
    return acorn.parse(code, { ecmaVersion: "latest", sourceType: "script" });
  }
}
