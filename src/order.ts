/**
 * Describes the order of transformations.
 */
export enum Order {
  Preparation = 0,

  ObjectExtraction = 1,

  Flatten = 2,

  Lock = 3, // Includes Anti Debug

  RGF = 4,

  Dispatcher = 6,

  DeadCode = 8,

  Calculator = 9,

  ControlFlowFlattening = 10,

  GlobalConcealing = 12,

  OpaquePredicates = 13,

  FunctionOutlining = 14,

  StringSplitting = 16,

  StringConcealing = 17,

  StringCompression = 18,

  VariableMasking = 20,

  DuplicateLiteralsRemoval = 22,

  Shuffle = 24,

  MovedDeclarations = 26,

  RenameLabels = 27,

  Minify = 28,

  AstScrambler = 29,

  RenameVariables = 30,

  Finalizer = 35,

  Integrity = 36, // Must run last
}
