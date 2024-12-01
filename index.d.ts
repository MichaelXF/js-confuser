// Export all the types from the index file
export * from "./src/index";
export { default } from "./src/index";

// Export useful types
export type {
  ObfuscateOptions,
  ProbabilityMap,
  CustomLock,
  CustomStringEncoding,
} from "./src/options";
export type {
  ObfuscationResult,
  ProfileData,
  ProfilerCallback,
  ProfilerLog,
} from "./src/obfuscationResult";
