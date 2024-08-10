/**
 * Keywords disallowed for variable names in ES5 and under.
 */
export const reservedKeywords = new Set([
  "abstract",
  "arguments",
  "await",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "function",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "int",
  "interface",
  "let",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "volatile",
  "while",
  "with",
  "yield",
]);

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

export const noRenameVariablePrefix = "__NO_JS_CONFUSER_RENAME__";
export const placeholderVariablePrefix = "__p_";

/**
 * Tells the obfuscator this function is predictable:
 * -  Never called with extraneous parameters
 */
export const predictableFunctionTag = "__JS_PREDICT__";

/**
 * Tells the obfuscator this function is critical for the Obfuscated code.
 * -  Example: string decryption function
 */
export const criticalFunctionTag = "__JS_CRITICAL__";

/**
 * Allows the user to grab the variable name of a renamed variable.
 */
export const variableFunctionName = "__JS_CONFUSER_VAR__";
