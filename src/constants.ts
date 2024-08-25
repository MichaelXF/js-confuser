export const predictableFunctionTag = "__JS_PREDICT__";

export const UNSAFE = Symbol("unsafe");
export const PREDICTABLE = Symbol("predictable");

export interface NodeSymbol {
  [UNSAFE]?: boolean;
  [PREDICTABLE]?: boolean;
}
