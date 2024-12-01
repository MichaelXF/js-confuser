/**
 * A function is 'unsafe' if it requires 'eval', 'arguments' or 'this'
 *
 * Transformations will generally not touch unsafe functions.
 */
export const UNSAFE = Symbol("unsafe");

/**
 * A function is 'predictable' if the invoking parameter lengths are guaranteed to be known.
 *
 * ```js
 * a(1,2,3) // predictable
 * a(...[1,2,3]) // unpredictable
 * ```
 */
export const PREDICTABLE = Symbol("predictable");

/**
 * A node is marked as 'skip' if it should not be transformed.
 *
 * Preserved throughout transformations, so be careful with this.
 */
export const SKIP = Symbol("skip");

/**
 * Saves the original length of a function.
 */
export const FN_LENGTH = Symbol("fnLength");

export const NO_RENAME = Symbol("noRename");

/**
 * This Identifier is used for a hexadecimal number or escaped string.
 */
export const GEN_NODE = Symbol("genNode");

/**
 * This function is used to mark functions that when transformed will most likely cause a maximum call stack error.
 *
 * Examples: Native Function Check
 */
export const MULTI_TRANSFORM = Symbol("multiTransform");

/**
 * The function contains a `with` statement.
 *
 * OR
 *
 * This identifier is used for a `with` statement.
 *
 * Tells Pack not to globally transform the node.
 */
export const WITH_STATEMENT = Symbol("withStatement");

/**
 * Tells minify to not remove the node.
 */
export const NO_REMOVE = Symbol("noRemove");

/**
 * Symbols describe precomputed semantics of a node, allowing the obfuscator to make the best choices for the node.
 */
export interface NodeSymbol {
  [UNSAFE]?: boolean;
  [PREDICTABLE]?: boolean;
  [SKIP]?: boolean | number;
  [FN_LENGTH]?: number;
  [NO_RENAME]?: string | number;

  [GEN_NODE]?: boolean;
  [MULTI_TRANSFORM]?: boolean;
  [WITH_STATEMENT]?: boolean;
  [NO_REMOVE]?: boolean;
}

/**
 * Allows the user to grab the variable name of a renamed variable.
 */
export const variableFunctionName = "__JS_CONFUSER_VAR__";

export const noRenameVariablePrefix = "__NO_JS_CONFUSER_RENAME__";
export const placeholderVariablePrefix = "__p_";

/**
 * Identifiers that are not actually variables.
 */
export const reservedIdentifiers = new Set([
  "undefined",
  "null",
  "NaN",
  "Infinity",
  "eval",
  "arguments",
]);

/**
 * Reserved Node.JS module identifiers.
 */
export const reservedNodeModuleIdentifiers = new Set([
  "module",
  "exports",
  "require",
]);

export const reservedObjectPrototype = new Set([
  "toString",
  "valueOf",
  "constructor",
  "__proto__",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
]);

/**
 * For Zero Width generator - Mangled variable names
 */
export const reservedKeywords = [
  "if",
  "in",
  "do",
  "for",
  "let",
  "new",
  "try",
  "var",
  "case",
  "else",
  "null",
  "with",
  "break",
  "catch",
  "class",
  "const",
  "super",
  "throw",
  "while",
  "yield",
  "delete",
  "export",
  "import",
  "public",
  "return",
  "switch",
  "default",
  "finally",
  "private",
  "continue",
  "debugger",
  "function",
  "arguments",
  "protected",
  "instanceof",
  "await",
  "async",

  // new key words and other fun stuff :P
  "NaN",
  "undefined",
  "true",
  "false",
  "typeof",
  "this",
  "static",
  "void",
  "of",
];
