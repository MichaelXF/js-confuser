/**
 * Describes the order of transformations.
 */
export enum ObfuscateOrder {
  Preparation = 0,

  ObjectExtraction = 1,

  Lock = 2, // Includes Integrity & Anti Debug

  Dispatcher = 3,

  OpaquePredicates = 4,
  DeadCode = 5,

  Calculator = 6,

  // Fixes all If Statements
  ControlFlowFlattening = 7,

  Flatten = 7,
  RGF = 8,

  // Optional
  Eval = 8,

  GlobalConcealing = 9,

  // Hides all strings
  StringConcealing = 10,

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
