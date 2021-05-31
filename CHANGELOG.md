# `1.1.1`
General fixes
- No longer encodes `"use strict"` and other directives
- No longer encodes `require("str")` or `import("str")` strings

- Fixed several `controlFlowFlattening` bugs:
  Fixed rare code corruption nested
  Fixed obfuscation on `for` and `while` loops

- Fixed `stack` from creating syntax errors
  (No longer applies to for-loop initializers)

- Fixed renaming identifiers in object destructing
- Better support for `let` variables

- Increased test coverage to 90%

- Checks for invalid options


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