import TransformClass from "./src/transforms/transform";
import ObfuscatorClass from "./src/obfuscator";
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
export const Obfuscator: typeof ObfuscatorClass;
export const Transform: typeof TransformClass;
