import compileJs, { compileJsSync } from "./compiler";
import parseJS, { parseSync } from "./parser";
import Obfuscator from "./obfuscator";
import Transform from "./transforms/transform";
import { createObject, remove$Properties } from "./util/object";
import presets from "./presets";

import * as assert from "assert";
import { correctOptions, ObfuscateOptions } from "./options";
import { ProbabilityMap } from "./probability";
import { IJsConfuser } from "./types";

/**
 * Determines if a probability map can return a positive result (true, or some string mode).
 * - Negative probability maps are used to remove transformations from running entirely.
 * @param map
 */
export function isProbabilityMapProbable<T>(map: ProbabilityMap<T>): boolean {
  if (!map || typeof map === "undefined") {
    return false;
  }
  if (typeof map === "function") {
    return true;
  }
  if (typeof map === "number") {
    if (map > 1 || map < 0) {
      throw new Error(`Numbers must be between 0 and 1 for 0% - 100%`);
    }
    if (isNaN(map)) {
      throw new Error("Numbers cannot be NaN");
    }
  }
  if (Array.isArray(map)) {
    assert.ok(
      map.length != 0,
      "Empty arrays are not allowed for options. Use false instead."
    );

    if (map.length == 1) {
      return !!map[0];
    }
  }
  if (typeof map === "object") {
    var keys = Object.keys(map);
    assert.ok(
      keys.length != 0,
      "Empty objects are not allowed for options. Use false instead."
    );

    if (keys.length == 1) {
      return !!keys[0];
    }
  }
  return true;
}

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

JsConfuser.obfuscate = obfuscate;
JsConfuser.presets = presets;
export default JsConfuser;

export async function debugTransformations(
  code: string,
  options: ObfuscateOptions
): Promise<{ name: string; code: string }[]> {
  options = await correctOptions(options);

  var frames = [];

  var tree = parseSync(code);
  var obfuscator = new Obfuscator(options);

  obfuscator.on("debug", (name: string, tree: Node) => {
    frames.push({
      name: name,
      code: compileJsSync(tree, options),
    });
  });

  await obfuscator.apply(tree);

  return frames;
}

export { presets, Obfuscator, Transform };
