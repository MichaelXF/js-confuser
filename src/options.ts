import Template from "./templates/template";

// JS-Confuser.com imports this file for Type support, therefore some additional types are included here.

type Stringed<V> = V extends string ? V : never;

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
export type ProbabilityMap<
  T = boolean,
  F extends (...args: any[]) => any = () => boolean // Default to a generic function
> =
  | false
  | true
  | number
  | F
  | (T extends never | boolean
      ? {
          value: ProbabilityMap<never, F>;
          limit?: number;
        }
      : T | T[] | { [key in Stringed<T>]?: number });

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
  code?: string | Template;
  encode: (str: string) => string;

  /**
   * Optional. A decoder function can be provided to ensure the string is able to decode properly.
   * @param str
   * @returns
   */
  decode?: (str: string) => string;

  /**
   * Should be used when created 'shuffled' variants of the same encoding.
   */
  identity?: string;
}

export interface ObfuscateOptions {
  /**
   * The preset to use for obfuscation.
   */
  preset?: "high" | "medium" | "low" | false;

  /**
   * The execution context for your output. _Required_.
   *
   * 1. `"node"`
   * 2. `"browser"`
   */
  target: "node" | "browser";

  /**
   * Remove's whitespace from the final output.
   */
  compact?: boolean;

  /**
   * Uses the hexadecimal representation for numbers.
   */
  hexadecimalNumbers?: boolean;

  /**
   * Minifies redundant code.
   */
  minify?: boolean;

  /**
   * Renames labeled statements. Enabled by default.
   */
  renameLabels?: ProbabilityMap<boolean, (labelName: string) => boolean>;

  /**
   * Determines if variables should be renamed.
   */
  renameVariables?: ProbabilityMap<
    boolean,
    (variableName: string, topLevel: boolean) => boolean
  >;

  /**
   * Renames top-level variables, turn this off for web-related scripts. Enabled by default.
   */
  renameGlobals?: ProbabilityMap<boolean, (variableName: string) => boolean>;

  /**
   * Determines how variables are renamed.
   *
   * JS-Confuser tries to reuse names when possible, creating very potent code.
   */
  identifierGenerator?: ProbabilityMap<
    | "hexadecimal"
    | "randomized"
    | "zeroWidth"
    | "mangled"
    | "number"
    | "chinese",
    () => string
  >;

  /**
   * ⚠️ Significantly impacts performance, use sparingly!
   *
   * Control-flow Flattening hinders program comprehension by creating convoluted switch statements.
   *
   * Use a number to control the percentage from 0 to 1.
   */
  controlFlowFlattening?: ProbabilityMap<boolean>;

  /**
   * Global Concealing hides global variables being accessed.
   */
  globalConcealing?: ProbabilityMap<boolean, (globalName: string) => boolean>;

  /**
   * String Compression uses zlib compression algorithm to compress strings.
   *
   * `"console"` -> `inflate('replaĕ!ğğuģģ<~@')`
   */
  stringCompression?: ProbabilityMap<boolean, (strValue: string) => boolean>;

  /**
   * String Concealing involves encoding strings to conceal plain-text values.
   *
   * `"console"` -> `decrypt('<~@rH7+Dert~>')`
   */
  stringConcealing?: ProbabilityMap<boolean, (strValue: string) => boolean>;

  /**
   * Custom String Encodings allows you to define your own string encoding/decoding functions.
   */
  customStringEncodings?: (
    | CustomStringEncoding
    | ((encodingImplementations: {
        [identity: string]: CustomStringEncoding;
      }) => CustomStringEncoding | null)
  )[];

  /**
   * String Encoding transforms a string into an escaped unicode representation.
   *
   * `"console"` -> `'\x63\x6f\x6e\x73\x6f\x6c\x65'`
   */
  stringEncoding?: ProbabilityMap<boolean, (strValue: string) => boolean>;

  /**
   * String Splitting splits your strings into multiple expressions.
   *
   * `"console"` -> `String.fromCharCode(99) + 'ons' + 'ole'`
   */
  stringSplitting?: ProbabilityMap<boolean, (strValue: string) => boolean>;

  /**
   * Duplicate Literals Removal replaces duplicate literals with a single variable name.
   */
  duplicateLiteralsRemoval?: ProbabilityMap<boolean>;

  /**
   * Creates a middleman function to process function calls.
   */
  dispatcher?: ProbabilityMap<boolean, (fnName: string) => boolean>;

  /**
   * RGF (Runtime-Generated-Functions) uses the [`new Function(code...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) syntax to construct executable code from strings.
   *
   * - **This can break your code.**
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
  rgf?: ProbabilityMap<boolean, (fnName: string, isGlobal: boolean) => boolean>;

  /**
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
  variableMasking?: ProbabilityMap<boolean, (fnName: string) => boolean>;

  /**
   * Extracts object properties into separate variables.
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
   */
  objectExtraction?: ProbabilityMap<boolean, (objectName: string) => boolean>;

  /**
   * Declares functions at the top of the program, preserving their original scope.
   */
  flatten?: ProbabilityMap<boolean, (fnName: string) => boolean>;

  /**
   * Randomly injects dead code.
   *
   * Use a number to control the percentage from 0 to 1.
   */
  deadCode?: ProbabilityMap<boolean>;

  /**
   * Creates a calculator function to handle arithmetic and logical expressions.
   *
   */
  calculator?: ProbabilityMap<boolean>;

  lock?: {
    /**
     * Prevents the use of code beautifiers or formatters against your code.
     *
     * [Identical to Obfuscator.io's Self Defending](https://github.com/javascript-obfuscator/javascript-obfuscator#selfdefending)
     *
     */
    selfDefending?: boolean;

    /**
     * Adds `debugger` statements throughout the code.
     */
    antiDebug?: ProbabilityMap<boolean>;

    /**
     * Tamper Protection safeguards the runtime behavior from being altered by JavaScript pitfalls.
     *
     * **⚠️ Tamper Protection requires eval and ran in a non-strict mode environment!**
     *
     * - **This can break your code.**
     * - **Due to the security concerns of arbitrary code execution, you must enable this yourself.**
     *
     * @see https://github.com/MichaelXF/js-confuser/blob/master/TamperProtection.md
     */
    tamperProtection?: ProbabilityMap<boolean, (varName: string) => boolean>;

    /**
     * When the program is first able to be used. (`number` or `Date`)
     *
     * Number should be in milliseconds.
     */
    startDate?: number | Date | false;

    /**
     * When the program is no longer able to be used. (`number` or `Date`)
     *
     * Number should be in milliseconds.
     */
    endDate?: number | Date | false;

    /**
     * Array of regex strings that the `window.location.href` must follow.
     */
    domainLock?: RegExp[] | string[] | false;

    /**
     * Integrity ensures the source code is unchanged.
     *
     * @see https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md
     */
    integrity?: ProbabilityMap<boolean, (fnName: string) => boolean>;

    /**
     * A custom callback function to invoke when a lock is triggered. (`string/false`)
     *
     * This could be due to an invalid domain, incorrect time, or code's integrity changed.
     *
     * If no countermeasures function is provided (`undefined` or `true`), the obfuscator falls back to crashing the process.
     *
     * If `countermeasures` is `false`, no crash will occur.
     *
     * @see https://github.com/MichaelXF/js-confuser/blob/master/Countermeasures.md
     */
    countermeasures?: string | boolean;

    customLocks?: CustomLock[];

    /**
     * The default 'maxCount' for obfuscator and custom locks. Defaults to 25.
     */
    defaultMaxCount?: number;
  };

  /**
   * Moves variable declarations to the top of the context.
   */
  movedDeclarations?: ProbabilityMap<boolean>;

  /**
   * An [Opaque Predicate](https://en.wikipedia.org/wiki/Opaque_predicate) is a predicate(true/false) that is evaluated at runtime, this can confuse reverse engineers
   * understanding your code.
   */
  opaquePredicates?: ProbabilityMap<boolean>;

  /**
   * Shuffles the initial order of arrays. The order is brought back to the original during runtime. (`"hash"/true/false/0-1`)
   */
  shuffle?: ProbabilityMap<boolean>;

  /**
   * Modified functions will retain the correct `function.length` property. Enabled by default.
   */
  preserveFunctionLength?: boolean;

  /**
   * Semantically changes the AST to bypass automated tools.
   */
  astScrambler?: boolean;

  /**
   * Packs the output code into a single `Function()` call.
   *
   * Designed to escape strict mode constraints.
   */
  pack?: ProbabilityMap<boolean, (globalName: string) => boolean>;

  /**
   * Set of global variables. *Optional*.
   */
  globalVariables?: Set<string>;

  /**
   * Enable logs to view the obfuscator's state.
   */
  verbose?: boolean;
}
