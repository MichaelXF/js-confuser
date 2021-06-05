import compileJs, { compileJsSync } from "./compiler";
import parseJS, { parseSync } from "./parser";
import Obfuscator from "./obfuscator";
import Transform from "./transforms/transform";
import { remove$Properties } from "./util/object";
import presets from "./presets";

import * as assert from "assert";
import { correctOptions, ObfuscateOptions } from "./options";
import { IJsConfuser, IJsConfuserDebugTransformations } from "./types";

/**
 * **JsConfuser**: Obfuscates JavaScript.
 * @param code - The code to be obfuscated.
 * @param options - An object of obfuscation options: `{preset: "medium", target: "browser"}`.
 */
export async function obfuscate(code: string, options: ObfuscateOptions) {
  return await JsConfuser(code, options);
}

/**
 * **JsConfuser**: Obfuscates JavaScript.
 * @param code - The code to be obfuscated.
 * @param options - An object of obfuscation options: `{preset: "medium", target: "browser"}`.
 */
var JsConfuser: IJsConfuser = async function (
  code: string,
  options: ObfuscateOptions
): Promise<string> {
  assert.ok(options, "options cannot be null");
  assert.ok(
    options.target,
    "Missing options.target option (required, must one the following: 'browser' or 'node')"
  );
  assert.ok(
    ["browser", "node"].includes(options.target),
    `'${options.target}' is not a valid target mode`
  );

  if (Object.keys(options).length == 1) {
    /**
     * Give a welcoming introduction to those who skipped the documentation.
     */
    var line = `You provided zero obfuscation options. By default everything is disabled.\nYou can use a preset with:\n\n> {target: '${options.target}', preset: 'high' | 'medium' | 'low'}.\n\n\nView all settings here:\nhttps://github.com/MichaelXF/js-confuser#options`;
    throw new Error(
      `\n\n` +
        line
          .split("\n")
          .map((x) => `\t${x}`)
          .join("\n") +
        `\n\n`
    );
  }

  options = await correctOptions(options);

  var tree = await parseJS(code);

  var obfuscator = new Obfuscator(options);

  await obfuscator.apply(tree);

  options.verbose && console.log("* Removing $ properties");

  remove$Properties(tree);

  options.verbose && console.log("* Generating code");

  var result = await compileJs(tree, options);

  return result;
} as any;

var debugTransformations: IJsConfuserDebugTransformations =
  async function debugTransformations(
    code: string,
    options: ObfuscateOptions
  ): Promise<{ name: string; code: string; ms: number }[]> {
    options = await correctOptions(options);

    var frames = [];

    var tree = parseSync(code);
    var obfuscator = new Obfuscator(options);

    var time = Date.now();

    obfuscator.on("debug", (name: string, tree: Node) => {
      frames.push({
        name: name,
        code: compileJsSync(tree, options),
        ms: Date.now() - time,
      });

      time = Date.now();
    });

    await obfuscator.apply(tree, true);

    return frames;
  };

JsConfuser.obfuscate = obfuscate;
JsConfuser.presets = presets;
JsConfuser.debugTransformations = debugTransformations;
JsConfuser.Obfuscator = Obfuscator;
JsConfuser.Transform = Transform;

export default JsConfuser;

export { presets, Obfuscator, Transform };
