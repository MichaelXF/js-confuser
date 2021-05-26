# Integrity

Integrity is a custom lock to detect changes to the source code.

If the code is determined modified, the changed code will not run.

## Programmatic Usage

```js
var JsConfuser = require("js-confuser");

JsConfuser.obfuscate("console.log(1)", {
  target: "browser",
  lock: {
    integrity: true,
  },
}).then((obfuscated) => {
  console.log(obfuscated);
});
```

## CLI Usage

```shell
<coming soon>
```

## Example

Consider the following obfuscated code:

```js
(function(){var jXwFUz=Math.imul||function(jXwFUz,m9pBnlk){m9pBnlk|=0;var n1mfO$O=(jXwFUz&4194303)*m9pBnlk;if(jXwFUz&4290772992)n1mfO$O+=(jXwFUz&4290772992)*m9pBnlk|0;return n1mfO$O|0};function m9pBnlk(n1mfO$O,humOEA){var DGCgjl=3735928559^humOEA;var S$63Fy1=1103547991^humOEA;for(var Lop2FFS=0,GC2VbAQ;Lop2FFS<n1mfO$O.length;Lop2FFS++){GC2VbAQ=n1mfO$O.charCodeAt(Lop2FFS);DGCgjl=jXwFUz(DGCgjl^GC2VbAQ,2654435761);S$63Fy1=jXwFUz(S$63Fy1^GC2VbAQ,1597334677)}DGCgjl=jXwFUz(DGCgjl^DGCgjl>>>16,2246822507)^jXwFUz(S$63Fy1^S$63Fy1>>>13,3266489909);S$63Fy1=jXwFUz(S$63Fy1^S$63Fy1>>>16,2246822507)^jXwFUz(DGCgjl^DGCgjl>>>13,3266489909);return 4294967296*(2097151&S$63Fy1)+(DGCgjl>>>0)}function n1mfO$O(jXwFUz){return jXwFUz.toString().replace(/ |\n|;|,|\{|\}|\(|\)/g,'')}function y3EzuX9(){console['log'](1)}var yzLesc=m9pBnlk(n1mfO$O(y3EzuX9),957);if(yzLesc==0x7a77799eaf937){return y3EzuX9.apply(this,arguments)}}())
```

The output:
```
> 1
```

Since we only applied Integrity, we can find the original `console['log'](1)` pretty easily.

Lets try to change the `console['log'](1)` to `console['log'](2)`:

```js
(function(){var jXwFUz=Math.imul||function(jXwFUz,m9pBnlk){m9pBnlk|=0;var n1mfO$O=(jXwFUz&4194303)*m9pBnlk;if(jXwFUz&4290772992)n1mfO$O+=(jXwFUz&4290772992)*m9pBnlk|0;return n1mfO$O|0};function m9pBnlk(n1mfO$O,humOEA){var DGCgjl=3735928559^humOEA;var S$63Fy1=1103547991^humOEA;for(var Lop2FFS=0,GC2VbAQ;Lop2FFS<n1mfO$O.length;Lop2FFS++){GC2VbAQ=n1mfO$O.charCodeAt(Lop2FFS);DGCgjl=jXwFUz(DGCgjl^GC2VbAQ,2654435761);S$63Fy1=jXwFUz(S$63Fy1^GC2VbAQ,1597334677)}DGCgjl=jXwFUz(DGCgjl^DGCgjl>>>16,2246822507)^jXwFUz(S$63Fy1^S$63Fy1>>>13,3266489909);S$63Fy1=jXwFUz(S$63Fy1^S$63Fy1>>>16,2246822507)^jXwFUz(DGCgjl^DGCgjl>>>13,3266489909);return 4294967296*(2097151&S$63Fy1)+(DGCgjl>>>0)}function n1mfO$O(jXwFUz){return jXwFUz.toString().replace(/ |\n|;|,|\{|\}|\(|\)/g,'')}function y3EzuX9(){console['log'](2)}var yzLesc=m9pBnlk(n1mfO$O(y3EzuX9),957);if(yzLesc==0x7a77799eaf937){return y3EzuX9.apply(this,arguments)}}())
```

The program no longer outputs anything. Integrity detected the change and stopped execution.

## How is this possible?

JavaScript has a sneaky method to view the source code any function. By calling `toString()` on any function, we can see the raw source code.
Integrity hashes the code during obfuscation phase and places an IF-statement embedded in the code. We used an additional regex to remove spaces, newlines, braces,
and commas to ensure the hash isn't too sensitive.

## Potential Issues

If you decide to use Integrity, consider the following:

1. Any build-tools must not modify the locked code, the code can't be changed after JsConfuser runs
2. .toString() functionality may not be enabled in your environment (compiled Electron apps)

