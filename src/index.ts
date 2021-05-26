import compileJs, { compileJsSync } from "./compiler";
import parseJS, { parseSync } from "./parser";
import Obfuscator from "./obfuscator";
import { createObject } from "./util/object";
import presets from "./presets";

import * as assert from "assert";

/**
 * Configurable probabilities for obfuscator options.
 * - **`false`** = this feature is disabled
 * - **`true`** = this feature is enabled, use default mode
 * - **`0.5`** = 50% chance
 * - **`"mode"`** = enabled, use specified mode
 * - **`["mode1", "mode2"]`** - enabled, choose random mode each occurrence
 * - **`{"mode1": 0.5, "mode2": 0.5}`** - enabled, choose based on specified probabilities
 * - **`{"mode1": 50, "mode2": 50}`** - enabled, each is divided based on total
 * - **`function(x){ return "custom_implementation" }`** - enabled, use specified function
 */
export type ProbabilityMap<T> =
  | false
  | true
  | number
  | T
  | T[]
  | { [name: string]: number }
  | ((object: any) => any);

/**
 * Evaluates a ProbabilityMap.
 * @param map The setting object.
 * @param runner Custom function to determine return value
 * @param customFnArgs Args given to user-implemented function, such as a variable name.
 */
export function ComputeProbabilityMap<T>(
  map: ProbabilityMap<T>,
  runner: (mode?: T) => any = (x) => x,
  ...customFnArgs: any[]
): any {
  if (!map) {
    return runner();
  }
  if (map === true || map === 1) {
    return runner(true as any);
  }
  if (typeof map === "number") {
    return runner((Math.random() < map) as any);
  }

  if (typeof map === "function") {
    return (map as any)(...customFnArgs);
  }
  if (typeof map === "string") {
    return runner(map);
  }
  var asObject: { [mode: string]: number } = {};
  if (Array.isArray(map)) {
    map.forEach((x: any) => {
      asObject[x.toString()] = 1;
    });
  } else {
    asObject = map as any;
  }

  var total = Object.values(asObject).reduce((a, b) => a + b);
  var percentages = createObject(
    Object.keys(asObject),
    Object.values(asObject).map((x) => x / total)
  );

  var ticket = Math.random();

  var count = 0;
  var winner = null;
  Object.keys(percentages).forEach((key) => {
    var x = parseFloat(percentages[key]);

    if (ticket >= count && ticket < count + x) {
      winner = key;
    }
    count += x;
  });

  return runner(winner);
}

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

export interface ObfuscateOptions {
  /**
   * Built-in obfuscation presets.
   *
   * - **`high`** - Godtier obfuscation, -90% performance reduction.
   * - **`medium`** - Moderate obfuscation, -50% performance reduction.
   * - **`low`** - Lowest level of obfuscation, -30% performance reduction.
   *
   * Presets are optional, and can be extended off of by overriding their properties.
   * ```js
   * var code = await JsConfuser("console.log('Hello World!')", {
   *     target: "node",
   *     preset: "high",
   *     stringEncoding: false // <- Normally true
   * });
   * ```
   */
  preset?: "high" | "medium" | "low";

  /**
   * For web-browser related scripts, use the **`browser`** mode.
   */
  target: "node" | "browser";

  /**
   * Removes whitespace.
   */
  compact?: boolean;

  /**
   * **Only for when compact is disabled**
   *
   * Controls the indentation style.
   * - **`2`** - 2 spaces
   * - **`4`** - 4 spaces (default)
   * - **`"tabs"`** - tabs
   */
  indent?: 2 | 4 | "tabs";

  /**
   * Minifies output.
   */
  minify?: boolean;

  /**
   * An [Opaque Predicate](https://en.wikipedia.org/wiki/Opaque_predicate) is a predicate(true/false) that is evaluated at runtime, this can confuse reverse engineers
   * understanding your code. Low cost, high performance.
   *
   * *This option is enabled in all presets*
   */
  opaquePredicates?: ProbabilityMap<false | true>;

  /**
   * Shuffles the initial order of arrays. The order is brought back to the original during runtime.
   */
  shuffle?: ProbabilityMap<false | true>;

  /**
   * Set of global variables, such as jQuery (`$`) or other external libraries.
   * Defaults to: `window`, `parseInt`, `Math` etc...
   */
  globalVariables?: Set<string>;

  /**
   * Locks control where the program can be executed.
   */
  lock?: {
    /**
     * Set of global functions that are native. Such as `require`, `fetch`. If these
     * variables are modified the program crashes.
     *
     * - Set to `true` to use the default list of native functions.
     */
    nativeFunctions?: Set<string> | true;

    /**
     * Array of properties that must be on the `window` or `global` object.
     *
     * - i.e `window['_customProperty']'`
     * - If the property is undefined, the program crashes (based on `countermeasures` field)
     */
    context?: string[];

    /**
     * When the program is first able to be used.
     *
     * - Type: `Date` or `number` representing unix in ms.
     */
    startDate?: Date | number;

    /**
     * When the program is no longer able to be used.
     *
     * - Type: `Date` or `number` representing unix in ms.
     */
    endDate?: Date | number;

    /**
     * Array of regex strings that the `window.location.href` must follow.
     *
     * - Type: Array of `string` or `RegExp`
     */
    domainLock?: (string | RegExp)[];

    /**
     * Integrity ensures the source code is unchanged.
     *
     * - Can break if output is then minified by another program.
     */
    integrity?: boolean;

    /**
     * Adds anti-debug related code.
     *
     * 1. Places `debugger` statements around your code.
     * 2. Runs an anti-debug function in the background.
     */
    antiDebug?: boolean;

    /**
     * If the client is caught missing permissions (wrong date, bad domain), this will
     * crash the current tab/process.
     *
     * - `true` - Crash the browser
     * - `"string"` - Function name to call (pre obfuscated)
     * - - `"codeChanged"` - Local function to call
     * - - `"window.__codeChanged"` - External function to call
     */
    countermeasures?: boolean | string;
  };

  /**
   * Logs each transformation, useful for debugging.
   * - **`false`** *Default*.
   */
  verbose?: boolean;

  /**
   * Leaves debug comments within the obfuscated code for identifying errors.
   * - **`false`** *Default*.
   */
  debugComments?: boolean;

  /**
   * Modes:
   * - **`hexadecimal`** - `_0xa8db5`
   * - **`randomized`** - `w$Tsu4G`
   * - **`zeroWidth`** - `U+200D`
   * - **`mangled`** - `a, b, c`
   * - **`number`** - `var_1, var_2`
   *
   * - ```js
   * // Custom implementation
   * JsConfuser(code, {
   *     identifierGenerator: ()=>"$" + Math.random().toString(36).substring(7)
   * })
   * ```
   */
  identifierGenerator?: ProbabilityMap<
    "hexadecimal" | "randomized" | "zeroWidth" | "mangled" | "number"
  >;

  /**
   * - **`false`** - Keep original names
   * - **`true`** -  Rename variables.
   * ```js
   * // Custom implementation
   * JsConfuser(code, {
   *     renameVariables: function(x){
   *         return x != "jQuery";
   *     }
   * })
   * ```
   */
  renameVariables?: ProbabilityMap<false | true>;

  /**
   * Renames top-level variables.
   *
   * - Keep this setting disabled for web-related scripts.
   * - `window.key = ...` will be remain unchanged.
   */
  renameGlobals?: ProbabilityMap<false | true>;

  /**
   * - **`false`** - Keep original function flow. *Default*.
   * - **`true`** - Creates a dispatcher function to process function calls.
   *
   * A Dispatcher middle-mans function calls.
   */
  dispatcher?: ProbabilityMap<false | true>;

  flatten?: ProbabilityMap<false | true>;

  /**
   * RGF (Runtime-Generated-Functions) uses the `new Function(code...)` syntax to construct executable code from strings.
   *
   * **This can break your code. This is also as dangerous as `eval` (eval is evil!)**
   *
   * ```js
   * // Input
   * function log(x) {
   *   console.log(x);
   * }
   * log("hi");
   *
   * // Output
   * var refs = [new Function('refs', 'x', 'console.log(x);')];
   * (function () {
   *   return refs[0](refs, ...arguments);
   * }('hi'));
   * ```
   */
  rgf?: ProbabilityMap<false | true>;

  /**
   * Defines all variables at the top of the scope.
   */
  movedDeclarations?: boolean;

  /**
   * - **`false`** - No calculator function
   * - **`true`** - Processes arithmetic and logical expressions.
   *
   * A calculator function helps obfuscate logic
   */
  calculator?: ProbabilityMap<false | true>;

  /**
   * [Control-flow Flattening](https://docs.jscrambler.com/code-integrity/documentation/transformations/control-flow-flattening) obfuscates the program's control-flow by
   * adding opaque predicates; flattening the control-flow; and adding irrelevant code clones.
   *
   * - Potency: High
   * - Resilience: High
   * - Cost: High
   */
  controlFlowFlattening?: ProbabilityMap<true | false>;

  /**
   * Adds Dead Code.
   */
  deadCode?: ProbabilityMap<false | true>;

  /**
   * - **`false`** - Keep objects in untouched form.
   * - **`true`** - Extract object's properties to help flatten the scope.
   * ```js
   * // Custom implementation to exclude certain objects
   * var options = {
   *     objectExtraction: function(name){
   *         return name != "$";
   *     }
   * }
   * ```
   */
  objectExtraction?: ProbabilityMap<false | true>;

  /**
   * Converts the code to ES5.
   */
  es5?: boolean;

  /**
   * [String Concealing](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-concealing) involves encoding strings to
   * conceal plain-text values. This is useful for both automated tools and reverse engineers.
   *
   * - Potency High
   * - Resilience Medium
   * - Cost Medium
   */
  stringConcealing?: ProbabilityMap<false | true>;

  /**
   * Global Concealing hides global variables being accessed.
   *
   * - Any variable that is not defined is considered "global"
   */
  globalConcealing?: ProbabilityMap<false | true>;

  /**
   * [String Encoding](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-encoding) transforms a string into an encoded representation.
   *
   * - Potency Low
   * - Resilience Low
   * - Cost Low
   */
  stringEncoding?: ProbabilityMap<false | true>;

  /**
   * [Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a variable name.
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Medium
   */
  duplicateLiteralsRemoval?: ProbabilityMap<false | true>;

  /**
   * [String Splitting](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-splitting) splits your strings into multiple expressions.
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Medium
   */
  stringSplitting?: ProbabilityMap<false | true>;

  /**
   * ## **`Security Warning`**
   * From [MDN]((https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)**): Executing JavaScript from a string is an enormous security risk. It is far too easy
   * for a bad actor to run arbitrary code when you use eval(). Never use eval()!
   *
   * Wraps defined functions within eval statements.
   * - **`false`** - Avoids using the `eval` function. *Default*.
   * - **`true`** - Wraps function's code into an `eval` statement.
   * - **`0.5`** - Example to limit the frequency (50% percent)
   *
   * ```js
   * // Output.js
   * var Q4r1__ = {
   *     'Oo$Oz8t': eval('(function(YjVpAp){var gniSBq6=kHmsJrhOO;switch(gniSBq6){case\'RW11Hj5x\':return console;}});')
   * }
   * Q4r1__.Oo$Oz8t('RW11Hj5x')
   * ```
   */
  eval?: ProbabilityMap<false | true>;
}

/**
 * **JsConfuser**: Obfuscates JavaScript.
 * @param code - The code to be obfuscated.
 * @param options - An object of obfuscation options: `{preset: "medium", target: "browser"}`.
 */
export async function obfuscate(code: string, options: ObfuscateOptions) {
  return await JsConfuser(code, options);
}

interface JsConfuser extends Function {
  obfuscate: (code: string, options: ObfuscateOptions) => Promise<string>;
}

/**
 * **JsConfuser**: Obfuscates JavaScript.
 * @param code - The code to be obfuscated.
 * @param options - An object of obfuscation options: `{preset: "medium", target: "browser"}`.
 */
var JsConfuser: JsConfuser = async function (
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
    var line = `You provided zero obfuscation options. By default everything is disabled.\nYou can use a preset with:\n\n> {target: '${options.target}', preset: 'high' | 'medium' | 'low'}.\n\n\nYou can also specify individual options you need.`;
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

(JsConfuser as any).obfuscate = obfuscate;
export default JsConfuser;

export async function correctOptions(
  options: ObfuscateOptions
): Promise<ObfuscateOptions> {
  if (options.preset) {
    assert.ok(
      presets[options.preset],
      "Unknown preset of '" + options.preset + "'"
    );

    // Clone and allow overriding
    options = Object.assign({}, presets[options.preset], options);
  }

  if (!options.hasOwnProperty("debugComments")) {
    options.debugComments = false; // debugComments is off by default
  }

  if (!options.hasOwnProperty("compact")) {
    options.compact = true; // Compact is on by default
  }

  if (options.globalVariables && !(options.globalVariables instanceof Set)) {
    options.globalVariables = new Set(Object.keys(options.globalVariables));
  }

  // options.globalVariables was never used.
  // GlobalConcealing implicitly determines a global to be a variable referenced but never defined or modified.
  if (!options.hasOwnProperty("globalVariables")) {
    options.globalVariables = new Set([]);

    if (options.target == "browser") {
      // browser
      [
        "window",
        "document",
        "postMessage",
        "alert",
        "confirm",
        "location",
      ].forEach((x) => options.globalVariables.add(x));
    } else {
      // node
      [
        "global",
        "Buffer",
        "require",
        "process",
        "__dirname",
        "__filename",
      ].forEach((x) => options.globalVariables.add(x));
    }

    [
      "globalThis",
      "console",
      "parseInt",
      "parseFloat",
      "Math",
      "Promise",
      "String",
      "Boolean",
      "Function",
      "Object",
      "Array",
      "Proxy",
      "Error",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "queueMicrotask",
      "exports",
      "module",
    ].forEach((x) => options.globalVariables.add(x));
  }

  return options;
}

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

/**
 * Removes all `$`-prefixed properties on a deeply nested object.
 *
 * - Modifies the object.
 */
export function remove$Properties(object: any, seen = new Set<Node>()) {
  if (typeof object === "object" && object) {
    if (seen.has(object)) {
      // console.log(object);
      // throw new Error("Already seen");
    }
    seen.add(object);

    Object.keys(object).forEach((key) => {
      if (key.charAt(0) == "$") {
        delete object[key];
      } else {
        remove$Properties(object[key], seen);
      }
    });
  }
}
