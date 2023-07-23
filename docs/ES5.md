## `ES5`

The ES5 option converts most ES6+ features into ES5 compatible code.

Option name: `es5`

Option values: `true/false`

Note: Does not cover all cases such as Promises or Generator functions. Use [Babel](https://babel.dev/).

The ES5 option is intended to undo any ES6 feature the obfuscator adds to your code. If you input ES5 code, and enable the `es5` option, you can be guaranteed to have ES5 compatible output.

## Example

```js
// Input
function print(...messages){
  console.log(...messages); // The spread operator (...) 
                            // was introduced in ES6!
}

print("Hello", "World"); // "Hello World"

// Output
var __p_2580918143;
function print() {
    var __p_7607361496;
    var messages, __p_2591841272 = (__p_7607361496 = Array.prototype.slice.call(arguments), messages = __p_7607361496.slice(0));
    (__p_2580918143 = console).log.apply(__p_2580918143, [].concat(Array.prototype.slice.call(messages)));
}
print('Hello', 'World'); // "Hello World"
```

## Polyfill Array Methods

When the ES5 option is enabled, array method polyfills will be injected to the top of your script.

```js
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(callback, thisArg) {
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }
        var array = this;
        thisArg = thisArg || this;
        for (var i = 0, l = array.length; i !== l; ++i) {
            callback.call(thisArg, array[i], i, array);
        }
    };
}
```

## Destructuring

The ES5 option supports transpiling the destructuring patterns.

```js
// Input
var {userName, email} = { userName: "John", email: "email@exampe.com" };

// Output
var __p_7467473759;
var userName, email, __p_4755992742 = (__p_7467473759 = {
        userName: 'John',
        email: 'email@exampe.com'
    }, userName = __p_7467473759.userName, email = __p_7467473759.email);
```

## Spread Operator

The ES5 option supports transpiling the spread operator.

```js
// Input
array.push(...objects);

// Output
var __p_6344935930;
(__p_6344935930 = array).push.apply(__p_6344935930, [].concat(Array.prototype.slice.call(objects)));
```

## Template String

The ES5 option supports transpiling template strings.

```js
// Input
var myString = `Hello ${userName}`;

// Output
var myString = 'Hello ' + (userName + '');
```

## Object getters/setters

The ES5 option supports transpiling getter and setter methods.

```js
// Input
var _name;
var myObject = {
  get name(){
    return _name;
  },
  set name(newName){
    _name = newName;
  }
};

// Output
function __p_6886881506(base, computedProps, getters, setters) {
    for (var i = 0; i < computedProps.length; i++) {
        base[computedProps[i][0]] = computedProps[i][1];
    }
    var keys = Object.create(null);
    Object.keys(getters).forEach(function (key) {
        return keys[key] = 1;
    });
    Object.keys(setters).forEach(function (key) {
        return keys[key] = 1;
    });
    Object.keys(keys).forEach(function (key) {
        Object.defineProperty(base, key, {
            set: setters[key],
            get: getters[key],
            configurable: true
        });
    });
    return base;
}
var _name;
var myObject = __p_6886881506({}, [], {
    'name': function () {
        return _name;
    }
}, {
    'name': function (newName) {
        _name = newName;
    }
});
```

## Arrow Functions

The ES5 option converts arrow functions into regular functions.

```js
// Input
var print = message => console.log(message);

// Output
var print = function (message) {
    return console.log(message);
};
```

## Const/Let

The ES5 option converts `const` and `let` to a regular `var` keyword.

```js
// Input
let myVar1 = true;
const myVar2 = "String";

// Output
var myVar1 = true;
var myVar2 = 'String';
```

## Classes

The ES5 option partially supports transpiling classes.

## Reserved Identifiers

The ES5 option will change any illegal uses of reserved identifiers.

```js
// Input
var myObject = {true: 1};
myObject.for = true;

// Output
var myObject = {"true": 1};
myObject["for"] = true;
```

## Features not supported

- Promises
- Async / Await
- Generator functions
- Nullish coalescing
- Optional chaining

Use [Babel](https://babel.dev/) to transpile these features. JS-Confuser will only support features the obfuscator may potentially add to your code.