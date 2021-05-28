import { ObfuscateOptions } from "./src/options";

interface JsConfuser extends Function {
  obfuscate: (code: string, options: ObfuscateOptions) => Promise<string>;
}

export default JsConfuser;
export function obfuscate(
  code: string,
  options: ObfuscateOptions
): Promise<string>;
