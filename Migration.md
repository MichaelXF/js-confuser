## Migration guide to JS-Confuser 2.0

JS-Confuser 2.0 is complete rewrite of the original JS-Confuser created in 2020!

## API Interface changed

### JSConfuser.obfuscate() returns an object now

The method `JSConfuser.obfuscate()` resolves to a object now instead of a string. This result object contains a property `code` which is the obfuscated code.

```diff
const JSConfuser = require("js-confuser");
const sourceCode = `console.log("Hello World")`;
const options = {
  target: "node",
  preset: "high"
};

JSConfuser.obfuscate(sourceCode, options).then(result=>{
  // 'result' is now an object
- console.log(result);
+ console.log(result.code);
});
```

### Removed Anti Debug Lock / Browser Lock / OS Lock

These features have been removed but you can still add these locks using the `lock.customLocks` option.

```js
{
  target: "node",
  
  // ... Your obfuscator settings ...

  lock: {
    customLocks: [
      {
        code: `
        // This code will be sprinkled throughout your source code
        // (Will also be obfuscated)

        if( window.navigator.userAgent.includes('Chrome') ){
          {countermeasures}
        }

        // The {countermeasures} template variable is required.
        // Must be placed in a Block or Switch Case body
        `,
        percentagePerBlock: 0.1, // = 10%
        maxCount: 25, // Default = 25 - You probably don't want an excessive amount placed
        minCount: 1 // Default = 1 - Ensures this custom lock is placed
      }
    ]
  }
}
```

### Stack renamed to Variable Masking

The option `stack` has been renamed to `variableMasking`

[Similar to JScrambler's Variable Masking](https://docs.jscrambler.com/code-integrity/documentation/transformations/variable-masking)

```diff
const options = {
  target: "node",
  preset: "high"

- stack: true,
+ variableMasking: true
};
```