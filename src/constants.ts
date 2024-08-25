export const predictableFunctionTag = "__JS_PREDICT__";

export const UNSAFE = Symbol("unsafe");
export const PREDICTABLE = Symbol("predictable");

export interface NodeSymbol {
  [UNSAFE]?: boolean;
  [PREDICTABLE]?: boolean;
}

/**
 * Allows the user to grab the variable name of a renamed variable.
 */
export const variableFunctionName = "__JS_CONFUSER_VAR__";

export const noRenameVariablePrefix = "__NO_JS_CONFUSER_RENAME__";
export const placeholderVariablePrefix = "__p_";
