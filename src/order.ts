/**
 * Describes the order of transformations.
 */
export enum ObfuscateOrder {
  Preparation = 0,

  ObjectExtraction = 1,

  Flatten = 2,

  RGF = 3,

  Lock = 4, // Includes Integrity & Anti Debug

  Stack = 5,

  Dispatcher = 6,

  DeadCode = 8,

  Calculator = 9,

  ControlFlowFlattening = 10,

  Eval = 11,

  GlobalConcealing = 12,

  OpaquePredicates = 13,

  StringSplitting = 16,

  StringConcealing = 17,

  StringCompression = 18,

  DuplicateLiteralsRemoval = 22,

  Shuffle = 24,

  MovedDeclarations = 25,

  RenameVariables = 26,

  RenameLabels = 27,

  Minify = 30,

  ES5 = 31,

  StringEncoding = 32,
}
