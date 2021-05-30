import { ObfuscateOptions } from "./options";

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

  (code: string, options: ObfuscateOptions): Promise<string>;
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
