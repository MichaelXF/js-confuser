/**
 * Describes the order of transformations.
 */
export enum ObfuscateOrder {
  Preparation = 0,

  ObjectExtraction = 1,

  Lock = 2, // Includes Integrity & Anti Debug
  Flatten = 3,

  RGF = 4,

  Stack = 5,

  Dispatcher = 6,

  OpaquePredicates = 7,
  DeadCode = 8,

  Calculator = 9,

  ControlFlowFlattening = 10,

  Eval = 11,

  GlobalConcealing = 12,

  StringSplitting = 16,

  StringConcealing = 17,

  DuplicateLiteralsRemoval = 23,

  Shuffle = 24,

  MovedDeclarations = 25,

  RenameVariables = 26,

  RenameLabels = 27,

  Minify = 30,

  ES5 = 31,

  StringEncoding = 32,
}
