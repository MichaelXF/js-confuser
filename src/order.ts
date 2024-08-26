/**
 * Describes the order of transformations.
 */
export enum Order {
  Preparation = 0,

  ObjectExtraction = 1,

  Flatten = 2,

  RGF = 3,

  Lock = 4, // Includes Integrity & Anti Debug

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

  VariableMasking = 20,

  DuplicateLiteralsRemoval = 22,

  Shuffle = 24,

  NameRecycling = 25,

  MovedDeclarations = 26,

  RenameLabels = 27,

  Minify = 28,

  AstScrambler = 29,

  RenameVariables = 30,

  Finalizer = 35,
}
