import Obfuscator from "./obfuscator";
import { ObfuscateOptions } from "./options";
import Transform from "./transforms/transform";

/**
 * **JsConfuser**: Obfuscates JavaScript.
 * @param code - The code to be obfuscated.
 * @param options - An object of obfuscation options: `{preset: "medium", target: "browser"}`.
 *
 * [See all settings here](https://github.com/MichaelXF/js-confuser#options)
 */
export interface IJsConfuser {
  obfuscate: IJsConfuserObfuscate;
  presets: IJsConfuserPresets;
  debugTransformations: IJsConfuserDebugTransformations;

  (code: string, options: ObfuscateOptions): Promise<string>;

  Transform: typeof Transform;
  Obfuscator: typeof Obfuscator;
}

/**
 * **JsConfuser**: Obfuscates JavaScript.
 * @param code - The code to be obfuscated.
 * @param options - An object of obfuscation options: `{preset: "medium", target: "browser"}`.
 *
 * [See all settings here](https://github.com/MichaelXF/js-confuser#options)
 */
export interface IJsConfuserObfuscate {
  (code: string, options: ObfuscateOptions): Promise<string>;
}

export interface IJsConfuserPresets {
  high: ObfuscateOptions;
  medium: ObfuscateOptions;
  low: ObfuscateOptions;
}

export type IJsConfuserDebugTransformations = (
  code: string,
  options: ObfuscateOptions
) => Promise<{ name: string; code: string; ms: number }[]>;
