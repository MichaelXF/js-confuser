import { ProbabilityMap } from "./probability";
import Template from "./templates/template";

export interface CustomLock {
  /**
   * Template lock code that must contain:
   *
   * - `{countermeasures}`
   *
   * The countermeasures function will be invoked when the lock is triggered.
   *
   * ```js
   * if(window.navigator.userAgent.includes('Chrome')){
   *   {countermeasures}
   * }
   * ```
   *
   * Multiple templates can be passed a string array, a random one will be chosen each time.
   */
  code: string | string[] | Template;
  percentagePerBlock: number;
  maxCount?: number;
  minCount?: number;
}

export interface CustomStringEncoding {
  /**
   * Template string decoder that must contain:
   *
   * - `{fnName}`
   *
   * This function will be invoked by the obfuscated code to DECODE the string.
   *
   * ```js
   * function {fnName}(str){
   *   return Buffer.from(str, 'base64').toString('utf-8')
   * }
   * ```
   */
  code: string;
  encode: (str: string) => string;
}

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
   */
  preset?: "high" | "medium" | "low" | false;

  /**
   * ### `target`
   *
   * The execution context for your output. _Required_.
   *
   * 1. `"node"`
   * 2. `"browser"`
   */
  target: "node" | "browser";

  /**
   * ### `indent`
   *
   * Controls the indentation of the output.
   */
  indent?: 2 | 4 | "tabs";

  /**
   * ### `compact`
   *
   * Remove's whitespace from the final output. (`true/false`)
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
   */
  minify?: boolean;

  renameLabels?: ProbabilityMap<boolean>;

  /**
   * ### `renameVariables`
   *
   * Determines if variables should be renamed. (`true/false`)
   */
  renameVariables?: ProbabilityMap<boolean>;

  /**
   * ### `renameGlobals`
   *
   * Renames top-level variables, turn this off for web-related scripts. Enabled by default. (`true/false`)
   *
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
   */
  controlFlowFlattening?: ProbabilityMap<boolean>;

  /**
   * ### `globalConcealing`
   *
   * Global Concealing hides global variables being accessed. (`true/false`)
   *
   */
  globalConcealing?: ProbabilityMap<boolean>;

  /**
   * ### `stringCompression`
   *
   * String Compression uses LZW's compression algorithm to compress strings. (`true/false/0-1`)
   *
   * `"console"` -> `inflate('replaĕ!ğğuģģ<~@')`
   *
   */
  stringCompression?: ProbabilityMap<boolean>;

  /**
   * ### `stringConcealing`
   *
   * String Concealing involves encoding strings to conceal plain-text values. (`true/false/0-1`)
   *
   * `"console"` -> `decrypt('<~@rH7+Dert~>')`
   *
   */
  stringConcealing?: ProbabilityMap<boolean>;

  /**
   * ### `stringEncoding`
   *
   * String Encoding transforms a string into an encoded representation. (`true/false/0-1`)
   *
   * `"console"` -> `'\x63\x6f\x6e\x73\x6f\x6c\x65'`
   *
   */
  stringEncoding?: ProbabilityMap<boolean>;

  /**
   * ### `stringSplitting`
   *
   * String Splitting splits your strings into multiple expressions. (`true/false/0-1`)
   *
   * `"console"` -> `String.fromCharCode(99) + 'ons' + 'ole'`
   *
   */
  stringSplitting?: ProbabilityMap<boolean>;

  /**
   * ### `duplicateLiteralsRemoval`
   *
   * Duplicate Literals Removal replaces duplicate literals with a single variable name. (`true/false`)
   *
   */
  duplicateLiteralsRemoval?: ProbabilityMap<boolean>;

  /**
   * ### `dispatcher`
   *
   * Creates a middleman function to process function calls. (`true/false/0-1`)
   *
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
   */
  rgf?: ProbabilityMap<boolean>;

  /**
   * ### `variableMasking`
   *
   * Local variables are consolidated into a rotating array.
   *
   * [Similar to Jscrambler's Variable Masking](https://docs.jscrambler.com/code-integrity/documentation/transformations/variable-masking)
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
   */
  objectExtraction?: ProbabilityMap<boolean>;

  /**
   * ### `flatten`
   *
   * Brings independent declarations to the highest scope. (`true/false`)
   *
   */
  flatten?: ProbabilityMap<boolean>;

  /**
   * ### `deadCode`
   *
   * Randomly injects dead code. (`true/false/0-1`)
   *
   * Use a number to control the percentage from 0 to 1.
   *
   */
  deadCode?: ProbabilityMap<boolean>;

  /**
   * ### `calculator`
   *
   * Creates a calculator function to handle arithmetic and logical expressions. (`true/false/0-1`)
   *
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
     */
    selfDefending?: boolean;

    /**
     * ### `lock.antiDebug`
     *
     * Adds `debugger` statements throughout the code. Additionally adds a background function for DevTools detection. (`true/false/0-1`)
     *
     */
    antiDebug?: ProbabilityMap<boolean>;

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
     */
    tamperProtection?: boolean | ((varName: string) => boolean);

    /**
     * ### `lock.startDate`
     *
     * When the program is first able to be used. (`number` or `Date`)
     *
     * Number should be in milliseconds.
     *
     */
    startDate?: number | Date | false;

    /**
     * ### `lock.endDate`
     *
     * When the program is no longer able to be used. (`number` or `Date`)
     *
     * Number should be in milliseconds.
     *
     */
    endDate?: number | Date | false;

    /**
     * ### `lock.domainLock`
     * Array of regex strings that the `window.location.href` must follow. (`Regex[]` or `string[]`)
     *
     */
    domainLock?: RegExp[] | string[] | false;

    /**
     * ### `lock.integrity`
     *
     * Integrity ensures the source code is unchanged. (`true/false/0-1`)
     *
     * [Learn more here](https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md).
     *
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
     * If no countermeasures function is provided (`undefined` or `true`), the obfuscator falls back to crashing the process.
     *
     * If `countermeasures` is `false`, no crash will occur.
     *
     */
    countermeasures?: string | boolean;

    customLocks?: CustomLock[];
  };

  customStringEncodings?: CustomStringEncoding[];

  /**
   * ### `movedDeclarations`
   *
   * Moves variable declarations to the top of the context. (`true/false`)
   *
   */
  movedDeclarations?: ProbabilityMap<boolean>;

  /**
   * ### `opaquePredicates`
   *
   * An [Opaque Predicate](https://en.wikipedia.org/wiki/Opaque_predicate) is a predicate(true/false) that is evaluated at runtime, this can confuse reverse engineers
   * understanding your code. (`true/false`)
   *
   */
  opaquePredicates?: ProbabilityMap<boolean>;

  /**
   * ### `shuffle`
   *
   * Shuffles the initial order of arrays. The order is brought back to the original during runtime. (`"hash"/true/false/0-1`)
   *
   * | Mode | Description |
   * | --- | --- |
   * | `"hash"`| Array is shifted based on hash of the elements  |
   * | `true`| Arrays are shifted *n* elements, unshifted at runtime |
   * | `false` | Feature disabled |
   *
   */
  shuffle?: ProbabilityMap<boolean | "hash">;

  /**
   * ### `verbose`
   *
   * Enable logs to view the obfuscator's state. (`true/false`)
   *
   */
  verbose?: boolean;

  /**
   * ### `globalVariables`
   *
   * Set of global variables. *Optional*. (`Set<string>`)
   *
   */
  globalVariables?: Set<string>;

  /**
   * ### `debugComments`
   *
   * Enable debug comments. (`true/false`)
   *
   */
  debugComments?: boolean;

  /**
   * ### `preserveFunctionLength`
   *
   * Modified functions will retain the correct `function.length` property. Enabled by default. (`true/false`)
   *
   */
  preserveFunctionLength?: boolean;

  astScrambler?: boolean;

  variableConcealing?: ProbabilityMap<boolean>;
}
