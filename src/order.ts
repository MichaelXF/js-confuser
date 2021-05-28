/**
 * Describes the order of transformations.
 */
export enum ObfuscateOrder {
  Preparation = 0,

  ObjectExtraction = 1,

  Lock = 2, // Includes Integrity & Anti Debug
  Flatten = 2,

  RGF = 4,

  Dispatcher = 5,

  OpaquePredicates = 6,
  DeadCode = 7,

  Calculator = 8,

  ControlFlowFlattening = 9,

  Eval = 11,

  GlobalConcealing = 12,

  StringConcealing = 13,

  StringSplitting = 20,

  DuplicateLiteralsRemoval = 23,

  Shuffle = 24,

  MovedDeclarations = 25,

  RenameVariables = 26,

  RenameLabels = 27,

  Minify = 30,

  ES5 = 31,

  StringEncoding = 32,
}
