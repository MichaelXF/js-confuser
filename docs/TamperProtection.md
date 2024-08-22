## `Tamper Protection`

Tamper Protection safeguards the runtime behavior from being altered by JavaScript pitfalls. 

**⚠️ Tamper Protection requires eval and ran in a non-strict mode environment!**

- **This can break your code.**
- **Due to the security concerns of arbitrary code execution, you must enable this yourself.**

Option name: `lock.tamperProtection`

Option values: `true/false/Function`

### 1. Improves `Global Concealing`

Tamper Protection with `Global Concealing` can detect at runtime if certain global functions have been monkey-patched. The following code exemplifies this:

#### (a) Native function check

```js
var _fetch = fetch;
fetch = (...args)=>{
  console.log("Fetch request intercepted!", ...args)
  return _fetch(...args)
}
```

This monkey-patch can be detected by inspecting the `fetch.toString()` value:

```js
// Untampered
fetch.toString() // "function fetch() { [native code] }"


// Tampered
fetch.toString()  // "(...args)=>{\n  console.log("Fetch request intercepted!", ...args)\n  return _fetch(...args)\n}"
```

Certain global functions are checked before each invocation to ensure that (1) the arguments cannot be intercepted and (2) their behavior cannot be altered.

#### (b) Stealthy global

A direct `eval` invocation can access the local scope, only if it has not been redefined.

```js
let root = {};
eval("root=this"); // Window {window: ...}
```

This method securely obtains the real global object for both the browser and NodeJS. Properties on the global object can still be changed however.

### 2. Improves `RGF`

RGF (Runtime-Generated-Functions) behavior's can be altered by overriding the default `Function` constructor. 
This allows a reverse engineer to inspect the concealed code and alter the behavior of the application.

When `lock.tamperProtection` is enabled, `RGF` will no longer use the `Function` constructor.
Instead, `eval` will be used with a strict integrity check.

```js
let check = false;
eval("check = true")
if (!check) {
    throw new Error("Eval was redefined")
}

const myFunction = eval("function abc(){}; abc");
```

Eval loses it's local scope access when redefined by a monkey-patched function. This example ensures the concealed code cannot be inspected or behavior be changed.

[Learn more about RGF](RGF.md).

### Custom Implementation

You can provide a custom implementation for `lock.tamperProtection` to control which functions get the native function check.

```js
{
  target: "node",
  lock: {
    tamperProtection: (fnName) => fnName === "console.log"
  }
}
```

### Disallows Strict Mode

Tamper Protection requires the script to run in non-strict mode. Detection of the script in Strict Mode will be considered tampering. You can control the tampering response using the `lock.countermeasures` option, as detailed in the next section.

### Tamper Detection

If tampering is detected, the `lock.countermeasures` function will be invoked. If you don't provide a `lock.countermeasures` function, the default behavior is to crash the program.

[Learn more about the countermeasures function](Countermeasures.md).

### See also

- [Countermeasures](Countermeasures.md)
- [RGF](RGF.md)
