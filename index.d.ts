import { ObfuscateOptions } from "./src/options";

interface JsConfuser {
  obfuscate: (code: string, options: ObfuscateOptions) => Promise<string>;

  (code: string, options: ObfuscateOptions): Promise<string>;
}

export default JsConfuser;
export function obfuscate(
  code: string,
  options: ObfuscateOptions
): Promise<string>;
