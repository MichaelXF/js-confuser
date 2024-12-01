import { ObfuscateOptions } from "./options";

/**
 * - High Obfuscation preset
 *
 * **This preset is unsafe and may break your code.**
 *
 * Security risks:
 *
 * - Function constructor (`Pack`)
 * - Escapes strict-mode constraints (`Pack`)
 * - Use of `with` statement (`Control Flow Flattening`)
 * - Object.prototype pollution (`Opaque Predicates`)
 * - Bloats file size (`Dead Code` and `String Compression` can add up to 50kb)
 */
const highPreset: ObfuscateOptions = {
  target: "node",
  preset: "high",

  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  controlFlowFlattening: 0.5,
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
  renameGlobals: true,
  shuffle: true,
  variableMasking: 0.75,
  stringConcealing: true,
  stringCompression: true,
  stringEncoding: true,
  stringSplitting: 0.75,
  astScrambler: true,

  // Experimental
  // functionOutlining: false,

  // Security risks
  pack: true,
};

/**
 * - Medium Obfuscation preset
 *
 * **This preset is unsafe and may break your code.**
 *
 * Security risks:
 *
 * - Function constructor (`Pack`)
 * - Escapes strict-mode constraints (`Pack`)
 * - Use of `with` statement (`Control Flow Flattening`)
 * - Object.prototype pollution (`Opaque Predicates`)
 * - Bloats file size (`Dead Code` can add up to 50kb)
 */
const mediumPreset: ObfuscateOptions = {
  target: "node",
  preset: "medium",

  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  controlFlowFlattening: 0.25,
  deadCode: 0.1,
  dispatcher: 0.5,
  duplicateLiteralsRemoval: 0.5,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  renameVariables: true,
  renameGlobals: true,
  shuffle: true,
  variableMasking: 0.5,
  stringConcealing: true,
  stringSplitting: 0.25,
  astScrambler: true,
  pack: true,
};

/**
 * - Low Obfuscation preset
 *
 * A balanced preset that provides basic obfuscation.
 *
 */
const lowPreset: ObfuscateOptions = {
  target: "node",
  preset: "low",

  calculator: true,
  compact: true,
  hexadecimalNumbers: true,
  deadCode: 0.05,
  dispatcher: 0.25,
  duplicateLiteralsRemoval: 0.5,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  renameVariables: true,
  renameGlobals: true,
  stringConcealing: true,
  astScrambler: true,
};

/**
 * Built-in obfuscator presets.
 */
const presets = {
  high: highPreset,
  medium: mediumPreset,
  low: lowPreset,
};

export default presets;
