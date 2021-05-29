import { ok } from "assert";
import presets from "./presets";
import { ProbabilityMap } from "./probability";

export interface ObfuscateOptions {
  /**
   * ### `preset`
   *
   * JS-Confuser comes with three presets built into the obfuscator.
   *
   * | Preset | Transforms | Performance Reduction | Sample |
   * | --- | --- | --- | --- |
   * | High | 21/22 | 98% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/high.js) |
   * | Medium | 15/22 | 52% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/medium.js) |
   * | Low | 10/22 | 30% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/low.js) |
   *
   * You can extend each preset or all go without them entirely. (`"high"/"medium"/"low"`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  preset?: "high" | "medium" | "low" | false;

  /**
   * ### `target`
   *
   * The execution context for your output. _Required_.
   *
   * 1. `"node"`
   * 2. `"browser"`
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  target: "node" | "browser";

  /**
   * ### `indent`
   *
   * Controls the indentation of the output.
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  indent?: 2 | 4 | "tabs";

  /**
   * ### `compact`
   *
   * Remove's whitespace from the final output. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  compact?: boolean;

  /**
   * ### `minify`
   *
   * Minifies redundant code. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  minify?: boolean;

  /**
   * ### `es5`
   *
   * Converts output to ES5-compatible code. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  es5?: boolean;

  /**
   * ### `renameVariables`
   *
   * Determines if variables should be renamed. (`true/false`)
   * - Potency High
   * - Resilience High
   * - Cost Medium
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  renameVariables?: ProbabilityMap<boolean>;

  /**
   * ### `renameGlobals`
   *
   * Renames top-level variables, keep this off for web-related scripts. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  renameGlobals?: ProbabilityMap<boolean>;

  /**
   * ### `identifierGenerator`
   *
   * Determines how variables are renamed.
   * Modes:
   *
   * - **`hexadecimal`** - \_0xa8db5
   * - **`randomized`** - w$Tsu4G
   * - **`zeroWidth`** - U+200D
   * - **`mangled`** - a, b, c
   * - **`number`** - var_1, var_2
   *
   * ```js
   * // Custom implementation
   * JsConfuser.obfuscate(code, {
   *   target: "node",
   *   renameVariables: true,
   *   identifierGenerator: function () {
   *     return "$" + Math.random().toString(36).substring(7);
   *   },
   * });
   *
   * // Numbered variables
   * var counter = 0;
   * JsConfuser.obfuscate(code, {
   *   target: "node",
   *   renameVariables: true,
   *   identifierGenerator: function () {
   *     return "_NAME_" + (counter++);
   *   },
   * });
   * ```
   *
   * JSConfuser tries to reuse names when possible, creating very potent code.
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  identifierGenerator?: ProbabilityMap<
    "hexadecimal" | "randomized" | "zeroWidth" | "mangled" | "number"
  >;

  /**
   * ### `controlFlowFlattening`
   *
   * [Control-flow Flattening](https://docs.jscrambler.com/code-integrity/documentation/transformations/control-flow-flattening) obfuscates the program's control-flow by
   * adding opaque predicates; flattening the control-flow; and adding irrelevant code clones. (`true/false`)
   *
   * Use a number to control the percentage from 0 to 1.
   *
   * - Potency High
   * - Resilience High
   * - Cost High
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  controlFlowFlattening?: ProbabilityMap<boolean>;

  /**
   * ### `globalConcealing`
   *
   * Global Concealing hides global variables being accessed. (`true/false`)
   *
   * - Potency Medium
   * - Resilience High
   * - Cost Low
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  globalConcealing?: ProbabilityMap<boolean>;

  /**
   * ### `stringConcealing`
   *
   * [String Concealing](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-concealing) involves encoding strings to conceal plain-text values. This is useful for both automated tools and reverse engineers. (`true/false`)
   *
   * `"console"` -> `decrypt('<~@rH7+Dert~>')`
   *
   * - Potency High
   * - Resilience Medium
   * - Cost Medium
   */
  stringConcealing?: ProbabilityMap<boolean>;

  /**
   * ### `stringEncoding`
   *
   * [String Encoding](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-encoding) transforms a string into an encoded representation. (`true/false`)
   *
   * `"console"` -> `'\x63\x6f\x6e\x73\x6f\x6c\x65'`
   *
   * - Potency Low
   * - Resilience Low
   * - Cost Low
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  stringEncoding?: ProbabilityMap<boolean>;

  /**
   * ### `stringSplitting`
   *
   * [String Splitting](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-splitting) splits your strings into multiple expressions. (`true/false`)
   *
   * `"console"` -> `String.fromCharCode(99) + 'ons' + 'ole'`
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Medium
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  stringSplitting?: ProbabilityMap<boolean>;

  /**
   * ### `duplicateLiteralsRemoval`
   *
   * [Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a single variable name. (`true/false`)
   *
   * - Potency Medium
   * - Resilience Low
   * - Cost High
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  duplicateLiteralsRemoval?: ProbabilityMap<boolean>;

  /**
   * ### `dispatcher`
   *
   * Creates a dispatcher function to process function calls. This can conceal the flow of your program. (`true/false`)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost High
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  dispatcher?: ProbabilityMap<boolean>;

  /**
   * ### `eval`
   *
   * #### **`Security Warning`**
   *
   * From [MDN](<(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)**>): Executing JavaScript from a string is an enormous security risk. It is far too easy
   * for a bad actor to run arbitrary code when you use eval(). Never use eval()!
   *
   * Wraps defined functions within eval statements.
   *
   * - **`false`** - Avoids using the `eval` function. _Default_.
   * - **`true`** - Wraps function's code into an `eval` statement.
   *
   * ```js
   * // Output.js
   * var Q4r1__ = {
   *   Oo$Oz8t: eval(
   *     "(function(YjVpAp){var gniSBq6=kHmsJrhOO;switch(gniSBq6){case'RW11Hj5x':return console;}});"
   *   ),
   * };
   * Q4r1__.Oo$Oz8t("RW11Hj5x");
   * ```
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  eval?: ProbabilityMap<boolean>;

  /**
   * ### `rgf`
   *
   * RGF (Runtime-Generated-Functions) uses the [`new Function(code...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) syntax to construct executable code from strings. (`"all"/true/false`)
   *
   * - **This can break your code. This is also as dangerous as `eval`.**
   * - **Due to the security concern of arbitrary code execution, you must enable this yourself.**
   * - The arbitrary code is obfuscated.
   *
   * | Mode | Description |
   * | --- | --- |
   * | `"all"` | Recursively applies to every scope (slow) |
   * | `true` | Applies to the top level only |
   * | `false` | Feature disabled |
   *
   * ```js
   * // Input
   * function log(x){
   *   console.log(x)
   * }
   *
   * log("Hello World")
   *
   * // Output
   * var C6z0jyO=[new Function('a2Fjjl',"function OqNW8x(OqNW8x){console['log'](OqNW8x)}return OqNW8x(...Array.prototype.slice.call(arguments,1))")];(function(){return C6z0jyO[0](C6z0jyO,...arguments)}('Hello World'))
   * ```
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  rgf?: ProbabilityMap<boolean | "all">;

  stack?: ProbabilityMap<boolean>;

  /**
   * ### `objectExtraction`
   *
   * Extracts object properties into separate variables. (`true/false`)
   *
   * - Potency Low
   * - Resilience Low
   * - Cost Low
   *
   * ```js
   * // Input
   * var utils = {
   *   isString: x=>typeof x === "string",
   *   isBoolean: x=>typeof x === "boolean"
   * }
   * if ( utils.isString("Hello") ) {
   *   // ...
   * }
   *
   * // Output
   * var utils_isString = x=>typeof x === "string";
   * var utils_isBoolean = x=>typeof x === "boolean"
   * if ( utils_isString("Hello") ) {
   *   // ...
   * }
   * ```
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  objectExtraction?: ProbabilityMap<boolean>;

  /**
   * ### `flatten`
   *
   * Brings independent declarations to the highest scope. (`true/false`)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost High
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  flatten?: ProbabilityMap<boolean>;

  /**
   * ### `deadCode`
   *
   * Randomly injects dead code. (`true/false/0-1`)
   *
   * Use a number to control the percentage from 0 to 1.
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Low
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  deadCode?: ProbabilityMap<boolean>;

  /**
   * ### `calculator`
   *
   * Creates a calculator function to handle arithmetic and logical expressions. (`true/false/0-1`)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Low
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  calculator?: ProbabilityMap<boolean>;

  lock?: {
    /**
     * ### `lock.antiDebug`
     *
     * Adds `debugger` statements throughout the code. Additionally adds a background function for DevTools detection. (`true/false/0-1`)
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    antiDebug?: ProbabilityMap<boolean>;

    /**
     * ### `lock.context`
     *
     * Properties that must be present on the `window` object (or `global` for NodeJS). (`string[]`)
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    context?: string[];

    /**
     * ### `lock.nativeFunctions`
     *
     * Set of global functions that are native. Such as `require`, `fetch`. If these variables are modified the program crashes.
     * Set to `true` to use the default native functions. (`string[]/true/false`)
     *
     * - Potency Low
     * - Resilience Medium
     * - Cost Medium
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    nativeFunctions?: string[] | Set<string> | boolean;

    /**
     * ### `lock.startDate`
     *
     * When the program is first able to be used. (`number` or `Date`)
     *
     * - Potency Low
     * - Resilience Medium
     * - Cost Medium
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    startDate?: number | Date | false;

    /**
     * ### `lock.endDate`
     *
     * When the program is no longer able to be used. (`number` or `Date`)
     *
     * - Potency Low
     * - Resilience Medium
     * - Cost Medium
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    endDate?: number | Date | false;

    /**
     * ### `lock.domainLock`
     * Array of regex strings that the `window.location.href` must follow. (`Regex[]` or `string[]`)
     *
     * - Potency Low
     * - Resilience Medium
     * - Cost Medium
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    domainLock?: RegExp[] | string[] | false;

    /**
     * ### `lock.integrity`
     *
     * Integrity ensures the source code is unchanged. (`true/false/0-1`)
     * [Learn more here](https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md).
     *
     * - Potency Medium
     * - Resilience High
     * - Cost High
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    integrity?: ProbabilityMap<boolean>;

    /**
     * ### `lock.countermeasures`
     *
     * A custom callback function to invoke when a lock is triggered.
     *
     * This could be due to an invalid domain, incorrect time, or code's integrity changed.
     *
     * [Learn more about the rules of your countermeasures function](https://github.com/MichaelXF/js-confuser/blob/master/Countermeasures.md).
     *
     * Otherwise, the obfuscator falls back to crashing the process.
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    countermeasures?: string;
  };

  /**
   * ### `movedDeclarations`
   *
   * Moves variable declarations to the top of the context. (`true/false`)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Low
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  movedDeclarations?: ProbabilityMap<boolean>;

  /**
   * ### `opaquePredicates`
   *
   * An [Opaque Predicate](https://en.wikipedia.org/wiki/Opaque_predicate) is a predicate(true/false) that is evaluated at runtime, this can confuse reverse engineers
   * understanding your code. (`true/false`)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Low
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  opaquePredicates?: ProbabilityMap<boolean>;

  /**
   * ### `shuffle`
   *
   * Shuffles the initial order of arrays. The order is brought back to the original during runtime. (`"hash"/true/false/0-1`)
   *
   * - Potency Medium
   * - Resilience Low
   * - Cost Low
   *
   * | Mode | Description |
   * | --- | --- |
   * | `"hash"`| Array is shifted based on hash of the elements  |
   * | `true`| Arrays are shifted *n* elements, unshifted at runtime |
   * | `false` | Feature disabled |
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  shuffle?: ProbabilityMap<boolean | "hash">;

  /**
   * ### `verbose`
   *
   * Enable logs to view the obfuscators state. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  verbose?: boolean;

  /**
   * ### `globalVariables`
   *
   * Set of global variables. Optional. (`Set<string>`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  globalVariables?: Set<string>;

  /**
   * ### `debugComments`
   *
   * Enable debug comments. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  debugComments?: boolean;
}

export async function correctOptions(
  options: ObfuscateOptions
): Promise<ObfuscateOptions> {
  if (options.preset) {
    ok(presets[options.preset], "Unknown preset of '" + options.preset + "'");

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
      "isNaN",
      "isFinite",
    ].forEach((x) => options.globalVariables.add(x));
  }

  return options;
}
