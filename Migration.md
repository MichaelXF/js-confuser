## Migration guide to JS-Confuser 2.0

JS-Confuser 2.0 is complete rewrite of the original JS-Confuser created in 2020!

### JSConfuser.obfuscate() returns an object now

The method `JSConfuser.obfuscate()` resolves to a object now instead of a string. This result object contains the obfuscated code on the `code` property.

```js
JSConfuser.obfuscate(sourceCode, options).then(result=>{
  console.log(result.code);
});
```

### Removed Anti Debug Lock / Browser Lock / OS Lock

These features have been removed but you can still add these locks using the `lock.customLocks` option.

```js
{
  lock: {
    customLocks: [
      {
        template: `if(window.navigator.userAgent.includes('Chrome')){
        {countermeasures}
}`,
        percentage: 10,
        max: 100
      }
    ]
  }
}
```

### Stack renamed to Variable Masking

The option `stack` has been renamed to `variableMasking`

### Flatten renamed to Function Hoisting

The option `flatten` has been renamed to `functionHoisting`