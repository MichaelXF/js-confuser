import { Transform as TransformClass } from "stream";
import { Obfuscator as ObfuscatorClass } from "./src/index";
import {
  IJsConfuser as JsConfuser,
  IJsConfuserDebugTransformations,
  IJsConfuserObfuscate,
  IJsConfuserPresets,
} from "./src/types";

export default JsConfuser;
export const obfuscate: IJsConfuserObfuscate;
export const presets: IJsConfuserPresets;
export const debugTransformations: IJsConfuserDebugTransformations;
export const Obfuscator: typeof TransformClass;
export const Transform: typeof ObfuscatorClass;
