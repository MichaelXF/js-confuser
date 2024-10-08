## `Countermeasures`

Countermeasures is a property on the `lock` object, determining the response to a triggered lock.

For instance, the `domainLock` determines the current domain is invalid.

```js
{
  target: "node",
  lock: {
    domainLock: ["mywebsite.com"],

    // crash process (default)
    countermeasures: true,

    // custom callback to invoke
    countermeasures: "onLockTriggered"
  }
}
```

## Crash Process

The default behavior is to crash the process This is done by an infinite loop to ensure the process becomes useless.

```js
while(true) {
  // ...
}
```

## Custom Callback

By setting countermeasures to a string, it can point to a callback to invoke when a lock is triggered.

The countermeasures callback function can either be a local name or an external name.

Examples:
- `"onLockTriggered"`
- `"window.onLockTriggered"`

If the function is defined within the locked code, it must follow the local name rules.

## Local Name rules

1. The function must be defined at the top-level of your program.
2. The function must not rely on any scoped variables.
3. The function cannot call functions outside it's context.

These rules are necessary to prevent an infinite loop from occurring.

## Test your countermeasure

#### Domain Lock:

Try your code within DevTools while on another website.

#### Time Lock:

Try setting your machine time to the past or before the allowed range.

#### Integrity:

Try changing a string within your code.

### See also

- [Integrity](Integrity.md)
- [Tamper Protection](TamperProtection.md)

