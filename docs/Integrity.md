## `Integrity`

JS-Confuser can detect changes to the source code and terminate execution. 

- **⚠️ This can break your code!**

Option name: `lock.integrity`

Option values: `true/false`

### Usage

```js
var JsConfuser = require("js-confuser");

var sourceCode = "console.log(1)"

JsConfuser.obfuscate(sourceCode, {
  target: "browser",
  lock: {
    integrity: true,
  },
}).then((obfuscated) => {
  console.log(obfuscated);
});
```

### Example

Consider the following code:

```js
console.log(1)

// 1
```

The obfuscated code (from Usage):

```js
(function(){var jXwFUz=Math.imul||function(jXwFUz,m9pBnlk){m9pBnlk|=0;var n1mfO$O=(jXwFUz&4194303)*m9pBnlk;if(jXwFUz&4290772992)n1mfO$O+=(jXwFUz&4290772992)*m9pBnlk|0;return n1mfO$O|0};function m9pBnlk(n1mfO$O,humOEA){var DGCgjl=3735928559^humOEA;var S$63Fy1=1103547991^humOEA;for(var Lop2FFS=0,GC2VbAQ;Lop2FFS<n1mfO$O.length;Lop2FFS++){GC2VbAQ=n1mfO$O.charCodeAt(Lop2FFS);DGCgjl=jXwFUz(DGCgjl^GC2VbAQ,2654435761);S$63Fy1=jXwFUz(S$63Fy1^GC2VbAQ,1597334677)}DGCgjl=jXwFUz(DGCgjl^DGCgjl>>>16,2246822507)^jXwFUz(S$63Fy1^S$63Fy1>>>13,3266489909);S$63Fy1=jXwFUz(S$63Fy1^S$63Fy1>>>16,2246822507)^jXwFUz(DGCgjl^DGCgjl>>>13,3266489909);return 4294967296*(2097151&S$63Fy1)+(DGCgjl>>>0)}function n1mfO$O(jXwFUz){return jXwFUz.toString().replace(/ |\n|;|,|\{|\}|\(|\)/g,'')}function y3EzuX9(){console['log'](1)}var yzLesc=m9pBnlk(n1mfO$O(y3EzuX9),957);if(yzLesc==0x7a77799eaf937){return y3EzuX9.apply(this,arguments)}}())

// 1
```

Since only Integrity is enabled, it's pretty easy to find the original code: `console['log'](1)`.

Let's try to change the `console['log'](1)` to `console['log'](2)`:

```js
(function(){var jXwFUz=Math.imul||function(jXwFUz,m9pBnlk){m9pBnlk|=0;var n1mfO$O=(jXwFUz&4194303)*m9pBnlk;if(jXwFUz&4290772992)n1mfO$O+=(jXwFUz&4290772992)*m9pBnlk|0;return n1mfO$O|0};function m9pBnlk(n1mfO$O,humOEA){var DGCgjl=3735928559^humOEA;var S$63Fy1=1103547991^humOEA;for(var Lop2FFS=0,GC2VbAQ;Lop2FFS<n1mfO$O.length;Lop2FFS++){GC2VbAQ=n1mfO$O.charCodeAt(Lop2FFS);DGCgjl=jXwFUz(DGCgjl^GC2VbAQ,2654435761);S$63Fy1=jXwFUz(S$63Fy1^GC2VbAQ,1597334677)}DGCgjl=jXwFUz(DGCgjl^DGCgjl>>>16,2246822507)^jXwFUz(S$63Fy1^S$63Fy1>>>13,3266489909);S$63Fy1=jXwFUz(S$63Fy1^S$63Fy1>>>16,2246822507)^jXwFUz(DGCgjl^DGCgjl>>>13,3266489909);return 4294967296*(2097151&S$63Fy1)+(DGCgjl>>>0)}function n1mfO$O(jXwFUz){return jXwFUz.toString().replace(/ |\n|;|,|\{|\}|\(|\)/g,'')}function y3EzuX9(){console['log'](2)}var yzLesc=m9pBnlk(n1mfO$O(y3EzuX9),957);if(yzLesc==0x7a77799eaf937){return y3EzuX9.apply(this,arguments)}}())
```

The program no longer outputs anything. Integrity has detected the change and stopped execution.

### How is this possible?

JavaScript has a sneaky method to view the source code any function. Calling `Function.toString()` on any function reveals the raw source code.

Integrity uses a hashing algorithm on the obfuscated code during the obfuscation-phase. The obfuscator then places checksum functions throughout the output code to verify it's unchanged at runtime.

An additional RegEx is utilized to remove spaces, newlines, braces, and commas. This ensures the hash isn't too sensitive.

### Tamper Detection

If tampering is detected, the `lock.countermeasures` function will be invoked. If you don't provide a `lock.countermeasures` function, the default behavior is to crash the program.

[Learn more about the countermeasures function](Countermeasures.md).

### Potential Issues

If you decide to use Integrity, consider the following:

1. Any build-tools must not modify the locked code. The code can't be changed after JS-Confuser is applied.
2. `Function.toString()` functionality may not be enabled in your environment (bytenode)

### See also

- [Countermeasures](Countermeasures.md)
- [Tamper Protection](TamperProtection.md)


