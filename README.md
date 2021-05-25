# JS-Confuser

JS-Confuser is a JavaScript obfuscation tool to make programs _impossible_ to read.

## Presets

JS-Confuser comes with three presets built into the obfuscator.
| Preset | Transforms | Performance Reduction | Sample |
| --- | --- | --- | --- |
| High | 21/22 | 98% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/high.js) |
| Medium | 15/22 | 52% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/medium.js) |
| Low | 10/22 | 30% | [Sample](https://github.com/MichaelXF/js-confuser/blob/master/samples/low.js) |

You can extend each preset or all go without them entirely.

## Programmatic Usage

```js
var JsConfuser = require("js-confuser");

JsConfuser(`source code`, {
  compact: true,
  minify: true,
  renameVariables: true,
  controlFlowFlattening: true,
}).then(obfuscated => {
  console.log(obfuscated);
});
```

## CLI Usage

```shell
<coming soon>
```

## Options

### `compact`

Remove's whitespace from the final output. (`true/false`)

### `minify`

Minifies redundant code (`true/false`)

### `renameVariables`

Determines if variables should be renamed. (`true/false`)

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
JsConfuser(code, {
  identifierGenerator: function () {
    return "$" + Math.random().toString(36).substring(7);
  },
});
```

### `controlFlowFlattening`

[Control-flow Flattening](https://docs.jscrambler.com/code-integrity/documentation/transformations/control-flow-flattening) obfuscates the program's control-flow by
adding opaque predicates; flattening the control-flow; and adding irrelevant code clones.

- Potency: High
- Resilience: High
- Cost: High

### `globalConcealing`

Global Concealing hides global variables being accessed. (`true/false`)

### `stringEncoding`

[String Encoding](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-encoding) transforms a string into an encoded representation.

- Potency Low
- Resilience Low
- Cost Low

### `stringSplitting`

[String Splitting](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-splitting) splits your strings into multiple expressions.

- Potency Medium
- Resilience Medium
- Cost Medium

### `duplicateLiteralsRemoval`

[Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a variable name.

- Potency Medium
- Resilience Medium
- Cost Medium

### `dispatcher`

Creates a dispatcher function to process function calls. This can conceal the flow of your program.

### `eval`

#### **`Security Warning`**

From [MDN](<(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)**>): Executing JavaScript from a string is an enormous security risk. It is far too easy
for a bad actor to run arbitrary code when you use eval(). Never use eval()!

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

### `objectExtraction`

Extracts object properties into separate variables. (`true/false`)

### `flatten`

Brings independent declarations to the highest scope. (`true/false`)

### `calculator`

Creates a calculator function to handle arithmetic and logical expressions.

### `lock.nativeFunctions`

Set of global functions that are native. Such as `require`, `fetch`. If these variables are modified the program crashes.

- Set to `true` to use the default native functions.

### `lock.startDate`

When the program is first able to be used. (number/Date)

### `lock.endDate`

When the program is no longer able to be used. (number/Date)

### `lock.domainLock`

Array of regex strings that the `window.location.href` must follow. `Regex[]` or `string[]`

### `lock.integrity`

Integrity ensures the source code is unchanged.

### `lock.countermeasures`

If the client is caught missing permissions (wrong date, bad domain), this will crash the current tab/process.

- `true` - Crash the browser
- `"string"` - Function name to call (pre obfuscated)

## About the internals

This obfuscator depends on two libraries to work: `acorn` and `escodegen`

- `acorn` is responsible for parsing source code into an AST.
- `escodegen` is responsible for generating source from modified AST.

The tree is modified by the transformation, who each step the entire tree down.
Properties starting with `$` are for saving information (typically circular data),
these properties are deleted before output.
