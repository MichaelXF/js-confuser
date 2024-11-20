import { PluginInstance } from "./transforms/plugin";
import { File } from "@babel/types";

/**
 * Obfuscation result object.
 */
export interface ObfuscationResult {
  /**
   * Obfuscated code.
   */
  code: string;
}

/**
 * Profile report for the obfuscation process.
 */
export interface ProfileData {
  obfuscationTime: number;
  compileTime: number;
  parseTime: number;
  totalPossibleTransforms: number;
  totalTransforms: number;
  transforms: {
    [transformName: string]: {
      transformTime: number;
      changeData: PluginInstance["changeData"];
      fileSize?: string;
    };
  };
}

/**
 * A callback function that is called when a transform is applied.
 */
export type ProfilerCallback = (
  log: ProfilerLog,
  transformEntry?: object,
  ast?: File
) => void;

/**
 * The current progress of the obfuscation process.
 */
export interface ProfilerLog {
  index: number;
  currentTransform: string;
  nextTransform: string;
  totalTransforms: number;
}
