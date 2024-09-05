export const predictableFunctionTag = "__JS_PREDICT__";

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

export interface NodeSymbol {
  [UNSAFE]?: boolean;
  [PREDICTABLE]?: boolean;
  [SKIP]?: boolean | number;
  [FN_LENGTH]?: number;
}

/**
 * Allows the user to grab the variable name of a renamed variable.
 */
export const variableFunctionName = "__JS_CONFUSER_VAR__";

export const noRenameVariablePrefix = "__NO_JS_CONFUSER_RENAME__";
export const placeholderVariablePrefix = "__p_";
