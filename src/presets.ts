import { ObfuscateOptions } from "./index";

/**
 * - High Obfuscation preset.
 * - **Average 90% performance reduction.**
 *
 * ## **`Enabled features`**
 * 1. Control Flow Flattening
 * 2. Dispatcher
 * 4. Renamed Variables
 * 5. String Concealing
 * 6. Global variables concealed
 * 7. Concealed `new` expressions
 * 8. Minified
 *
 * ## **`Disabled features`**
 * - `eval` Use at your own risk!
 * - `renameProperties` Can break code.
 * - `globalize` Can break code.
 *
 * ### Potential Issues
 * 1. *String Encoding* can corrupt files. Disabled `stringEncoding` manually if this happens.
 * 2. *Dead Code* can bloat file size. Reduce or disable `deadCode`.
 */
const reduction_98_percent: ObfuscateOptions = {
  target: "node",
  preset: "high",

  // heavy
  dispatcher: true,
  controlFlowFlattening: 0.75,

  // extract
  objectExtraction: true,

  // variables
  renameVariables: true,
  identifierGenerator: "randomized",

  // Simple
  calculator: true,
  deadCode: 0.25,

  minify: true,
  opaquePredicates: 0.75,

  duplicateLiteralsRemoval: 0.75,
  globalConcealing: true,
  stringConcealing: true,
  stringEncoding: true,
  stringSplitting: 0.75,

  // Use at own risk!
  eval: false,
  flatten: true,
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

  // variables
  renameVariables: true,
  identifierGenerator: "randomized",

  // Simple
  calculator: true,
  deadCode: 0.05,

  minify: true,
  opaquePredicates: 0.5,

  duplicateLiteralsRemoval: 0.5,
  globalConcealing: true,
  stringConcealing: true,

  // Use at own risk!
  eval: false,
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

  // variables
  renameVariables: true,
  identifierGenerator: "randomized",

  // Simple
  calculator: true,

  minify: true,
  opaquePredicates: true,

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
