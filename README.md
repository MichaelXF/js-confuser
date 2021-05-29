# JS Confuser

JS-Confuser is a JavaScript obfuscation tool to make your programs _impossible_ to read. [Try the web version](https://hungry-shannon-c1ce6b.netlify.app/).

## Key features

- Variable renaming
- Control Flow obfuscation
- String concealing
- Function obfuscation
- Locks (domainLock, date)
- [Detect changes to source code](https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md)

## Presets

JS-Confuser comes with three presets built into the obfuscator.
| Preset | Transforms | Performance Reduction | Sample |
| --- | --- | --- | --- |
| High | 21/22 | 98% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/high.js) |
| Medium | 15/22 | 52% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/medium.js) |
| Low | 10/22 | 30% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/low.js) |

You can extend each preset or all go without them entirely.

## Installation

```bash
$ npm install js-confuser
```

## Programmatic Usage

```js
var JsConfuser = require("js-confuser");

JsConfuser.obfuscate("console.log(1)", {
  target: "node",
  preset: "high",
  stringEncoding: false, // <- Normally enabled
}).then((obfuscated) => {
  console.log(obfuscated);
});
```

## CLI Usage

```shell
<coming soon>
```

## Options

### `target`

The execution context for your output. _Required_.

1. `"node"`
2. `"browser"`

### `preset`

[JS-Confuser comes with three presets built into the obfuscator](https://github.com/MichaelXF/js-confuser#presets). _Optional_. (`"high"/"medium"/"low"`)

### `compact`

Remove's whitespace from the final output. Enabled by default. (`true/false`)

### `minify`

Minifies redundant code. (`true/false`)

### `es5`

Converts output to ES5-compatible code. (`true/false`)

### `renameVariables`

Determines if variables should be renamed. (`true/false`)

- Potency High
- Resilience High
- Cost Medium

### `renameGlobals`

Renames top-level variables, keep this off for web-related scripts. (`true/false`)

### `identifierGenerator`

Determines how variables are renamed.
Modes:

- **`hexadecimal`** - \_0xa8db5
- **`randomized`** - w$Tsu4G
- **`zeroWidth`** - U+200D
- **`mangled`** - a, b, c
- **`number`** - var_1, var_2

```js
// Custom implementation
JsConfuser.obfuscate(code, {
  target: "node",
  renameVariables: true,
  identifierGenerator: function () {
    return "$" + Math.random().toString(36).substring(7);
  },
});

// Numbered variables
var counter = 0;
JsConfuser.obfuscate(code, {
  target: "node",
  renameVariables: true,
  identifierGenerator: function () {
    return "_NAME_" + (counter++);
  },
});
```

JSConfuser tries to reuse names when possible, creating very potent code.

### `controlFlowFlattening`

[Control-flow Flattening](https://docs.jscrambler.com/code-integrity/documentation/transformations/control-flow-flattening) obfuscates the program's control-flow by
adding opaque predicates; flattening the control-flow; and adding irrelevant code clones. (`true/false/0-1`)

Use a number to control the percentage from 0 to 1.


- Potency High
- Resilience High
- Cost High

### `globalConcealing`

Global Concealing hides global variables being accessed. (`true/false`)

- Potency Medium
- Resilience High
- Cost Low

### `stringConcealing`

[String Concealing](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-concealing) involves encoding strings to conceal plain-text values. (`true/false/0-1`)

Use a number to control the percentage of strings.

`"console"` -> `decrypt('<~@rH7+Dert~>')`
   
- Potency High
- Resilience Medium
- Cost Medium

### `stringEncoding`

[String Encoding](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-encoding) transforms a string into an encoded representation. (`true/false/0-1`)

Use a number to control the percentage of strings.

`"console"` -> `'\x63\x6f\x6e\x73\x6f\x6c\x65'`

- Potency Low
- Resilience Low
- Cost Low

### `stringSplitting`

[String Splitting](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-splitting) splits your strings into multiple expressions. (`true/false`)

`"console"` -> `String.fromCharCode(99) + 'ons' + 'ole'`

- Potency Medium
- Resilience Medium
- Cost Medium

### `duplicateLiteralsRemoval`

[Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a single variable name. (`true/false`)

- Potency Medium
- Resilience Low
- Cost High

### `dispatcher`

Creates a dispatcher function to process function calls. This can conceal the flow of your program. (`true/false`)

- Potency Medium
- Resilience Medium
- Cost High

### `eval`

#### **`Security Warning`**

From [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval): Executing JavaScript from a string is an enormous security risk. It is far too easy for a bad actor to run arbitrary code when you use eval(). Never use eval()!

Wraps defined functions within eval statements.

- **`false`** - Avoids using the `eval` function. _Default_.
- **`true`** - Wraps function's code into an `eval` statement.

```js
// Output.js
var Q4r1__ = {
  Oo$Oz8t: eval(
    "(function(YjVpAp){var gniSBq6=kHmsJrhOO;switch(gniSBq6){case'RW11Hj5x':return console;}});"
  ),
};
Q4r1__.Oo$Oz8t("RW11Hj5x");
```

### `rgf`

RGF (Runtime-Generated-Functions) uses the [`new Function(code...)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function) syntax to construct executable code from strings. (`"all"/true/false`)

- **This can break your code. This is also as dangerous as `eval`.**
- **Due to the security concern of arbitrary code execution, you must enable this yourself.**
- The arbitrary code is obfuscated.

| Mode | Description |
| --- | --- |
| `"all"` | Recursively applies to every scope (slow) |
| `true` | Applies to the top level only |
| `false` | Feature disabled |

```js
// Input
function log(x){
  console.log(x)
}

log("Hello World")

// Output
var C6z0jyO=[new Function('a2Fjjl',"function OqNW8x(OqNW8x){console['log'](OqNW8x)}return OqNW8x(...Array.prototype.slice.call(arguments,1))")];(function(){return C6z0jyO[0](C6z0jyO,...arguments)}('Hello World'))
```

### `objectExtraction`

Extracts object properties into separate variables. (`true/false`)

- Potency Low
- Resilience Low
- Cost Low

```js
// Input
var utils = {
  isString: x=>typeof x === "string",
  isBoolean: x=>typeof x === "boolean"
}
if ( utils.isString("Hello") ) {
  // ...
}

// Output
var utils_isString = x=>typeof x === "string";
var utils_isBoolean = x=>typeof x === "boolean"
if ( utils_isString("Hello") ) {
  // ...
}
```

### `flatten`

Brings independent declarations to the highest scope. (`true/false`)

- Potency Medium
- Resilience Medium
- Cost High

### `deadCode`

Randomly injects dead code. (`true/false/0-1`)

Use a number to control the percentage from 0 to 1.

- Potency Medium
- Resilience Medium
- Cost Low 

### `calculator`

Creates a calculator function to handle arithmetic and logical expressions. (`true/false/0-1`)

- Potency Medium
- Resilience Medium
- Cost Low

### `lock.antiDebug`

Adds `debugger` statements throughout the code. Additionally adds a background function for DevTools detection. (`true/false/0-1`)

### `lock.context`

Properties that must be present on the `window` object (or `global` for NodeJS). (`string[]`)

### `lock.startDate`

When the program is first able to be used. (`number` or `Date`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.endDate`

When the program is no longer able to be used. (`number` or `Date`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.domainLock`

Array of regex strings that the `window.location.href` must follow. (`Regex[]` or `string[]`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.nativeFunctions`

Set of global functions that are native. Such as `require`, `fetch`. If these variables are modified the program crashes.
Set to `true` to use the default native functions. (`string[]/true/false`)

- Potency Low
- Resilience Medium
- Cost Medium

### `lock.integrity`

Integrity ensures the source code is unchanged. (`true/false/0-1`)
[Learn more here](https://github.com/MichaelXF/js-confuser/blob/master/Integrity.md).

- Potency Medium
- Resilience High
- Cost High

### `lock.countermeasures`

A custom callback function to invoke when a lock is triggered. (`string`)


[Learn more about the countermeasures function](https://github.com/MichaelXF/js-confuser/blob/master/Countermeasures.md).

Otherwise, the obfuscator falls back to crashing the process.

### `movedDeclarations`

Moves variable declarations to the top of the context. (`true/false`)

- Potency Medium
- Resilience Medium
- Cost Low

### `opaquePredicates`

An [Opaque Predicate](https://en.wikipedia.org/wiki/Opaque_predicate) is a predicate(true/false) that is evaluated at runtime, this can confuse reverse engineers from understanding your code. (`true/false/0-1`)

- Potency Medium
- Resilience Medium
- Cost Low

### `shuffle`

Shuffles the initial order of arrays. The order is brought back to the original during runtime. (`"hash"/true/false/0-1`)

- Potency Medium
- Resilience Low
- Cost Low

| Mode | Description |
| --- | --- |
| `"hash"`| Array is shifted based on hash of the elements  |
| `true`| Arrays are shifted *n* elements, unshifted at runtime |
| `false` | Feature disabled |

## High preset
```js
{
  target: "node",
  preset: "high",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.75,
  deadCode: 0.25,
  dispatcher: true,
  duplicateLiteralsRemoval: 0.75,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.75,
  renameVariables: true,
  shuffle: { hash: 0.5, true: 0.5 },
  stringConcealing: true,
  stringEncoding: true,
  stringSplitting: 0.75,

  // Use at own risk
  eval: false,
  rgf: false,
}
```

## Medium preset
```js
{
  target: "node",
  preset: "medium",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.5,
  deadCode: 0.05,
  dispatcher: 0.75,
  duplicateLiteralsRemoval: 0.5,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.5,
  renameVariables: true,
  shuffle: true,
  stringConcealing: true,
  stringSplitting: 0.25,
}
```

## Low Preset

```js
{
  target: "node",
  preset: "low",

  calculator: true,
  compact: true,
  controlFlowFlattening: 0.25,
  deadCode: 0,
  dispatcher: 0.5,
  duplicateLiteralsRemoval: true,
  flatten: true,
  globalConcealing: true,
  identifierGenerator: "randomized",
  minify: true,
  movedDeclarations: true,
  objectExtraction: true,
  opaquePredicates: 0.1,
  renameVariables: true,
  stringConcealing: 0.25,
}
```

## Locks

You must enable locks yourself, and configure them to your needs.

```js
{
  target: "node",
  lock: {
    integrity: true,
    domainLock: ["mywebsite.com"],
    startDate: new Date("Feb 1 2021"),
    endDate: new Date("Mar 1 2021"),
    antiDebug: true,
    nativeFunctions: true,

    // crashes browser
    countermeasures: true,

    // or custom callback (pre-obfuscated name)
    countermeasures: "onLockDetected"
  }
}
```

## Optional features

These features are experimental or a security concern.

```js
{
  target: "node",
  eval: true, // (security concern)
  rgf: true, // (security concern)

  // can break web-related scripts,
  // OK for NodeJS scripts
  renameGlobals: true,

  // experimental
  identifierGenerator: function(){
    return "_CUSTOM_VAR_" + (counter++);
  }
}
```

## Percentages

Most settings allow percentages to control the frequency of the transformation. Fine-tune the percentages to keep file size down, and performance high.

```js
{
  target: "node",
  controlFlowFlattening: true // equal to 1, which is 100%

  controlFlowFlattening: 0.5 // 50%
  controlFlowFlattening: 0.01 // 1%
}
```

## Probabilities

Mix modes using an object with key-value pairs represent each mode's percentage.

```js
{
  target: "node",
  identifierGenerator: {
    "hexadecimal": 0.25, // 25% each
    "randomized": 0.25,
    "mangled": 0.25,
    "number": 0.25
  },

  shuffle: {hash: 0.5, true: 0.5} // 50% hash, 50% normal
}
```

## Custom Implementations

```js
{
  target: "node",
  
  // avoid renaming a variable
  renameVariables: x=>x!="jQuery",

  // custom variable names
  identifierGenerator: ()=>{
    return "_0x" + Math.random().toString(16).slice(2, 8);
  },

  // force encoding on a string
  stringConcealing: (str)=>{
    if (str=="https://mywebsite.com/my-secret-api"){
      return true;
    }

    // 60%
    return Math.random() < 0.6;
  },

  // set limits
  deadCode: ()=>{
    dead++; 

    return dead < 50;
  }
}
```

## Potential Issues

- 1.  String Encoding can corrupt files. Disable `stringEncoding` manually if this happens.
- 2.  Dead Code can bloat file size. Reduce or disable `deadCode`.

## Bug report

Please open an issue with the code and config used.

## Feature request

Please open an issue and be descriptive what you want. Don't submit any PRs until approved.

## JsConfuser vs. Javascript-obfuscator

Javascript-obfuscator ([https://obfuscator.io](obfuscator.io)) is the popular choice for JS obfuscation. This means more attackers are aware of their strategies. JSConfuser offers unique features such as Integrity, locks, and RGF.

Automated deobfuscators are aware of [https://obfuscator.io](obfuscator.io)'s techniques:

https://www.youtube.com/watch?v=_UIqhaYyCMI

However, the dev is quick to fix these. The one above no longer works.

Alternatively, you could go the paid-route with [JScrambler.com (enterprise only)](https://jscrambler.com/) or [PreEmptive.com](https://www.preemptive.com/products/jsdefender/online-javascript-obfuscator-demo)

I've included several alternative obfuscators in the `samples/` folder. They are all derived from the input.js file.

## Debugging

Enable logs to view the obfuscators state.

```js
{
  target: "node",
  verbose: true
}
```

## About the internals

This obfuscator depends on two libraries to work: `acorn` and `escodegen`

- `acorn` is responsible for parsing source code into an AST.
- `escodegen` is responsible for generating source from modified AST.

The tree is modified by transformations, which each step the traverse the entire tree.
Properties starting with `$` are for saving information (typically circular data),
these properties are deleted before output.
