export const predictableFunctionTag = "__JS_PREDICT__";

export const UNSAFE = Symbol("unsafe");

export interface NodeSymbol {
  [UNSAFE]?: boolean;
}
