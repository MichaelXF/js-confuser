/**
 * Describes the order of transformations.
 */
export enum Order {
  Preparation = 0,

  ObjectExtraction = 1,

  Flatten = 2,

  Lock = 3,

  RGF = 4,

  Dispatcher = 6,

  DeadCode = 8,

  Calculator = 9,

  GlobalConcealing = 12,

  OpaquePredicates = 13,

  StringSplitting = 16,

  StringConcealing = 17,

  StringCompression = 18,

  VariableMasking = 20,

  DuplicateLiteralsRemoval = 22,

  Shuffle = 23,

  ControlFlowFlattening = 24,

  MovedDeclarations = 25,

  RenameLabels = 27,

  Minify = 28,

  AstScrambler = 29,

  RenameVariables = 30,

  Finalizer = 35,

  Pack = 36,

  Integrity = 37, // Must run last
}
