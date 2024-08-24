import { ProbabilityMap } from "./probability";

export interface ObfuscateOptions {
  /**
   * ### `preset`
   *
   * JS-Confuser comes with three presets built into the obfuscator.
   *
   * | Preset | Transforms | Performance Reduction | Sample |
   * | --- | --- | --- | --- |
   * | High | 22/25 | 98% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/high.js) |
   * | Medium | 19/25 | 52% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/medium.js) |
   * | Low | 15/25 | 30% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/low.js) |
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
   * ### `hexadecimalNumbers`
   *
   * Uses the hexadecimal representation for numbers. (`true/false`)
   */
  hexadecimalNumbers?: boolean;

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
   * Does not cover all cases such as Promises or Generator functions. Use [Babel](https://babel.dev/).
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
   * Renames top-level variables, turn this off for web-related scripts. Enabled by default. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  renameGlobals?: ProbabilityMap<boolean>;

  /**
   * ### `identifierGenerator`
   *
   * Determines how variables are renamed.
   *
   * | Mode | Description | Example |
   * | --- | --- | --- |
   * | `"hexadecimal"` | Random hex strings | \_0xa8db5 |
   * | `"randomized"` | Random characters | w$Tsu4G |
   * | `"zeroWidth"` | Invisible characters | U+200D |
   * | `"mangled"` | Alphabet sequence | a, b, c |
   * | `"number"` | Numbered sequence | var_1, var_2 |
   * | `<function>` | Write a custom name generator | See Below |
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
   *     return "var_" + (counter++);
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
   * ⚠️ Significantly impacts performance, use sparingly!
   *
   * Control-flow Flattening hinders program comprehension by creating convoluted switch statements. (`true/false/0-1`)
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
   * ### `stringCompression`
   *
   * String Compression uses LZW's compression algorithm to compress strings. (`true/false/0-1`)
   *
   * `"console"` -> `inflate('replaĕ!ğğuģģ<~@')`
   *
   * - Potency High
   * - Resilience Medium
   * - Cost Medium
   */
  stringCompression?: ProbabilityMap<boolean>;

  /**
   * ### `stringConcealing`
   *
   * String Concealing involves encoding strings to conceal plain-text values. (`true/false/0-1`)
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
   * String Encoding transforms a string into an encoded representation. (`true/false/0-1`)
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
   * String Splitting splits your strings into multiple expressions. (`true/false/0-1`)
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
   * Duplicate Literals Removal replaces duplicate literals with a single variable name. (`true/false`)
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
   * Creates a middleman function to process function calls. (`true/false/0-1`)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost High
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  dispatcher?: ProbabilityMap<boolean>;

  /**
   * ### `rgf`
   *
   * RGF (Runtime-Generated-Functions) uses the [`new Function(code...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) syntax to construct executable code from strings. (`"all"/true/false`)
   *
   * - **This can break your code.
   * - **Due to the security concerns of arbitrary code execution, you must enable this yourself.**
   * - The arbitrary code is also obfuscated.
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
  rgf?: ProbabilityMap<boolean>;

  /**
   * ### `variableMasking`
   *
   * Local variables are consolidated into a rotating array.
   *
   * [Similar to Jscrambler's Variable Masking](https://docs.jscrambler.com/code-integrity/documentation/transformations/variable-masking)
   *
   * - Potency Medium
   * - Resilience Medium
   * - Cost Low
   *
   * ```js
   * // Input
   * function add3(x, y, z){
   *   return x + y + z;
   * }
   *
   * // Output
   * function iVQoGQD(...iVQoGQD){
   *   ~(iVQoGQD.length = 3, iVQoGQD[215] = iVQoGQD[2], iVQoGQD[75] = 227, iVQoGQD[iVQoGQD[75] - (iVQoGQD[75] - 75)] = iVQoGQD[75] - (iVQoGQD[75] - 239), iVQoGQD[iVQoGQD[iVQoGQD[75] - 164] - 127] = iVQoGQD[iVQoGQD[75] - 238], iVQoGQD[iVQoGQD[75] - 104] = iVQoGQD[75] - 482, iVQoGQD[iVQoGQD[135] + 378] = iVQoGQD[iVQoGQD[135] + 318] - 335, iVQoGQD[21] = iVQoGQD[iVQoGQD[135] + 96], iVQoGQD[iVQoGQD[iVQoGQD[75] - 104] - (iVQoGQD[75] - 502)] = iVQoGQD[iVQoGQD[75] - 164] - 440);
   *   return iVQoGQD[75] > iVQoGQD[75] + 90 ? iVQoGQD[iVQoGQD[135] - (iVQoGQD[135] + 54)] : iVQoGQD[iVQoGQD[135] + 117] + iVQoGQD[iVQoGQD[iVQoGQD[75] - (iVQoGQD[75] - (iVQoGQD[75] - 104))] - (iVQoGQD[135] - 112)] + iVQoGQD[215];
   * };
   * ```
   */
  variableMasking?: ProbabilityMap<boolean>;

  /**
   * ### `objectExtraction`
   *
   * Extracts object properties into separate variables. (`true/false`)
   *
   * - Potency Medium
   * - Resilience Medium
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
     * ### `lock.selfDefending`
     *
     * Prevents the use of code beautifiers or formatters against your code.
     *
     * [Identical to Obfuscator.io's Self Defending](https://github.com/javascript-obfuscator/javascript-obfuscator#selfdefending)
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    selfDefending?: boolean;

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
     * ### `lock.tamperProtection`
     *
     * Tamper Protection safeguards the runtime behavior from being altered by JavaScript pitfalls. (`true/false`)
     *
     * **⚠️ Tamper Protection requires eval and ran in a non-strict mode environment!**
     *
     * - **This can break your code.**
     * - **Due to the security concerns of arbitrary code execution, you must enable this yourself.**
     *
     * [Learn more here](https://github.com/MichaelXF/js-confuser/blob/master/TamperProtection.md).
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    tamperProtection?: boolean | ((varName: string) => boolean);

    /**
     * ### `lock.startDate`
     *
     * When the program is first able to be used. (`number` or `Date`)
     *
     * Number should be in milliseconds.
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
     * Number should be in milliseconds.
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
     * ### `lock.osLock`
     * Array of operating-systems where the script is allowed to run. (`string[]`)
     *
     * - Potency Low
     * - Resilience Medium
     * - Cost Medium
     *
     * Allowed values: `"linux"`, `"windows"`, `"osx"`, `"android"`, `"ios"`
     *
     * Example: `["linux", "windows"]`
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    osLock?: ("linux" | "windows" | "osx" | "android" | "ios")[] | false;

    /**
     * ### `lock.browserLock`
     * Array of browsers where the script is allowed to run. (`string[]`)
     *
     * - Potency Low
     * - Resilience Medium
     * - Cost Medium
     *
     * Allowed values: `"firefox"`, `"chrome"`, `"iexplorer"`, `"edge"`, `"safari"`, `"opera"`
     *
     * Example: `["firefox", "chrome"]`
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    browserLock?:
      | ("firefox" | "chrome" | "iexplorer" | "edge" | "safari" | "opera")[]
      | false;

    /**
     * ### `lock.integrity`
     *
     * Integrity ensures the source code is unchanged. (`true/false/0-1`)
     *
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
     * A custom callback function to invoke when a lock is triggered. (`string/false`)
     *
     * This could be due to an invalid domain, incorrect time, or code's integrity changed.
     *
     * [Learn more about the rules of your countermeasures function](https://github.com/MichaelXF/js-confuser/blob/master/Countermeasures.md).
     *
     * Otherwise, the obfuscator falls back to crashing the process.
     *
     * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
     */
    countermeasures?: string | boolean;
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
   * Enable logs to view the obfuscator's state. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  verbose?: boolean;

  /**
   * ### `globalVariables`
   *
   * Set of global variables. *Optional*. (`Set<string>`)
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

  /**
   * ### `preserveFunctionLength`
   *
   * Modified functions will retain the correct `function.length` property. Enabled by default. (`true/false`)
   *
   * [See all settings here](https://github.com/MichaelXF/js-confuser/blob/master/README.md#options)
   */
  preserveFunctionLength?: boolean;

  astScrambler?: boolean;
}
