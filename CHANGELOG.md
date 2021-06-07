# `1.1.5`
Performance Improvements

- **Bug fix**: Object Extraction
- - Improved safety checks (searches further down tree)
- - No longer applies to empty objects

- String Concealing results are now cached

- Minification improvements
- - `a += -1` -> `a -= 1`
- - `a -= -1` -> `a += 1`
- - `a + -b` -> `a - b`
- - `a - -b` -> `a + b`

- Dispatcher no longer applies to redefined functions

- Ensure `controlFlowFlattening` numbers don't get too large
  (hardcoded limit of 100,000)

- Opaque Predicates now excludes await expressions 

Available now on NPM: https://www.npmjs.com/package/js-confuser

# `1.1.4`
Improved ES5 Support

- Full support for transpiling [ES6 template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
- - Added `.raw` property for Tagged Template Literals

- Transpiling [ES6 Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes) down to ES5-compatible code
- Transpiling the [ES6 spread operator in arrays](https://www.samanthaming.com/tidbits/92-6-use-cases-of-spread-with-array/)
- Transpiling the [ES6 spread operator in objects](https://lucybain.com/blog/2018/js-es6-spread-operator/)

- Improved `controlFlowFlattening` to use multiple state variables
- Added chained-calls to `duplicateLiteralsRemoval`, similar to obfuscator.io's [`stringArrayWrappersChainedCalls`](https://github.com/javascript-obfuscator/javascript-obfuscator) option

Available now on NPM: https://www.npmjs.com/package/js-confuser

# `1.1.3`
Minification Changes

- Fixed minification errors
- - No longer accidentally removes function declarations/class declarations

- RGF Changes
- - Function cannot rely on `this`
- - Better support with `renameVariables`

- Opaque Predicate Changes
- - Now correctly applies to switch case tests

- Fixed Flatten bug causing undefined return values

- Support for transpiling [ES6 template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)

Available now on NPM: https://www.npmjs.com/package/js-confuser

# `1.1.2`
New String Compression feature and Fixed Syntax errors

- **New feature**: `stringCompression`
- - String Compression uses LZW's compression algorithm to reduce file size. (`true/false/0-1`)
- - `"console"` -> `inflate('replaĕ!ğğuģģ<~@')`
- - Potency High
- - Resilience Medium
- - Cost Medium

- Fixed error with String encoding

- Fixed syntax error from obfuscating destructuring with computed keys
- Fixed syntax error when getters/setters were being converted to arrow functions
- Integrity fixes:
- - Better support with Dispatcher
- - Better support with Calculator

Available now on NPM: https://www.npmjs.com/package/js-confuser

# `1.1.1`
General fixes
- No longer encodes `"use strict"` and other directives
- No longer encodes `require("str")` or `import("str")` strings

- Fixed several `controlFlowFlattening` bugs:
  Fixed rare code corruption when nested
  Fixed obfuscation on `for` and `while` loops

- Fixed `stack` from creating syntax errors
  (No longer applies to for-loop initializers)

- Fixed renaming identifiers in object destructing
- Better support for `let` variables

- Checks for invalid options
- Increased test coverage to 90%

- `debugTransformations`, `Obfuscator` and `Transform` objects exposed.

Available now on NPM: https://www.npmjs.com/package/js-confuser

# `1.1.0`
New feature: Stack, and various improvements
- **New feature:** `stack`
  Local variables are consolidated into a rotating array. (`true/false/0-1`)
  [Similar to Jscrambler's Variable Masking](https://docs.jscrambler.com/code-integrity/documentation/transformations/variable-masking)
 - Potency Medium
 - Resilience Medium
 - Cost Low
 
 ```js
 // input
 function add3(x, y, z){
   return x + y + z;
 }
 
 // output
 function add3(...AxaSQr){AxaSQr.length=3;return AxaSQr.shift()+AxaSQr.shift()+AxaSQr.shift()}
 ```

- Improvements to `flatten`
- Properly renames `let` variables now
- Improvements to `dispatcher`

Available now on NPM: https://www.npmjs.com/package/js-confuser

# `1.0.9`
Support for lower versions of NodeJS

- Adjusted babel config to be more forgiving to the older versions of NodeJS.


# `1.0.8`
New shuffle feature and improvements
- New feature for shuffle:
`hash` - Shift based on the hash of the array contents
If the hash changes, the order of the array will be messed up causing your program to brick.

- Lock improvements
Fixed issue with `nativeFunctions`
Now errors when `countermeasures` callback can't be found.
Countermeasures callback works with `Integrity`.
New rules for `countermeasures` callback: 
Must be top-level,
No references to locked code (otherwise infinite loop)

- General improvements
Updated presets and documentation
Added `index.d.ts` for type-intellisense

Available now on NPM: https://www.npmjs.com/package/js-confuser



# `1.0.7`
Integrity fixed
- Integrity Improvements
- - Countermeasures function works with Integrity
- - Fixed hashing issues
- - - Wrote more tests for integrity
- Documentation Update
- - Fixed errors in examples