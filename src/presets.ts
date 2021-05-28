import { ObfuscateOptions } from "./options";

/**
 * - High Obfuscation preset.
 * - **Average 90% performance reduction.**
 *
 * ## **`Enabled features`**
 * 1. Variable renaming
 * 2. Control flow obfuscation
 * 3. String concealing
 * 4. Opaque predicates
 * 5. Dead code
 * 6. Dispatcher
 * 7. Moved declarations
 * 8. Object extraction
 * 9. Global concealing
 * 10. Minified output
 *
 * ## **`Disabled features`**
 * - `eval` Use at your own risk!
 *
 * ### Potential Issues
 * 1. *String Encoding* can corrupt files. Disable `stringEncoding` manually if this happens.
 * 2. *Dead Code* can bloat file size. Reduce or disable `deadCode`.
 */
const reduction_98_percent: ObfuscateOptions = {
  target: "node",
  preset: "high",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.75,
  deadCode: 0.25,
  dispatcher: true,
  duplicateLiteralsRemoval: 0.75,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.75,
  renameVariables: true,
  shuffle: true,
  stringConcealing: true,
  stringEncoding: true,
  stringSplitting: 0.75,

  // Use at own risk!
  eval: false,
  rgf: false,
};

/**
 * - Medium Obfuscation preset.
 * - Average 50% performance reduction.
 */
const reduction_52_percent: ObfuscateOptions = {
  target: "node",
  preset: "medium",

  // heavy
  dispatcher: 0.75,
  controlFlowFlattening: 0.5,

  // extract
  objectExtraction: true,
  movedDeclarations: true,

  // variables
  renameVariables: true,
  identifierGenerator: "randomized",

  // Simple
  calculator: true,
  deadCode: 0.05,
  flatten: true,

  minify: true,
  opaquePredicates: 0.5,

  duplicateLiteralsRemoval: 0.5,
  globalConcealing: true,
  stringConcealing: true,
};

/**
 * - Low Obfuscation preset.
 * - Average 30% performance reduction.
 */
const reduction_30_percent: ObfuscateOptions = {
  target: "node",
  preset: "low",

  // heavy
  dispatcher: 0.5,
  controlFlowFlattening: 0.25,

  // extract
  objectExtraction: true,
  movedDeclarations: true,

  // variables
  renameVariables: true,
  identifierGenerator: "randomized",

  // Simple
  calculator: true,
  flatten: true,

  minify: true,
  opaquePredicates: 0.1,

  duplicateLiteralsRemoval: true,
  globalConcealing: true,

  // Use at own risk!
  eval: false,
};

/**
 * Built-in obfuscator presets.
 */
const presets = {
  high: reduction_98_percent,
  medium: reduction_52_percent,
  low: reduction_30_percent,
};

export default presets;
