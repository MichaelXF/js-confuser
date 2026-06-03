import { obfuscate, evalCode } from "../test-utils";

// Arguments
test("Variant #1: Multiple arguments are received correctly", async () => {
  const { code } = await obfuscate(`
    function sum(a, b, c) {
      return a + b + c;
    }
    window.TEST_OUTPUT = sum(1, 2, 3);
  `);

  expect(await evalCode(code)).toBe(6);
});

test("Variant #2: Missing arguments default to undefined", async () => {
  const { code } = await obfuscate(`
    function pack(a, b, c) {
      return [a, b, c];
    }
    window.TEST_OUTPUT = pack(1, 2);
  `);

  expect(await evalCode(code)).toEqual([1, 2, undefined]);
});

// Default parameters
test("Variant #3: Default parameter used when argument is omitted", async () => {
  const { code } = await obfuscate(`
    function greet(name, greeting = "Hello") {
      return greeting + ", " + name + "!";
    }
    window.TEST_OUTPUT = [greet("World"), greet("World", "Hi")];
  `);

  expect(await evalCode(code)).toEqual(["Hello, World!", "Hi, World!"]);
});

test("Variant #4: Default parameter is an expression", async () => {
  const { code } = await obfuscate(`
    function get100(){
      return 100;
    }

    function offset(x, base = get100()) {
      return x + base;
    }
    window.TEST_OUTPUT = [offset(5), offset(5, 10)];
  `);

  expect(await evalCode(code)).toEqual([105, 15]);
});

test("Variant #5: Default parameter is a function", async () => {
  const { code } = await obfuscate(`
    function offset(x, base = function(){ return 120 }) {
      return x + base();
    }
    window.TEST_OUTPUT = [offset(5), offset(5, function(){ return 10 })];
  `);

  expect(await evalCode(code)).toEqual([125, 15]);
});

// Return values
test("Variant #6: Explicit return value", async () => {
  const { code } = await obfuscate(`
    function max(a, b) {
      if (a > b) return a;
      return b;
    }
    window.TEST_OUTPUT = [max(3, 7), max(9, 4)];
  `);

  expect(await evalCode(code)).toEqual([7, 9]);
});

test("Variant #7: Implicit return is undefined", async () => {
  const { code } = await obfuscate(`
    function noReturn() {
      var x = 1;
    }
    window.TEST_OUTPUT = noReturn();
  `);

  expect(await evalCode(code)).toBeUndefined();
});

// Recursive functions
test("Variant #8: Recursive function (factorial)", async () => {
  const { code } = await obfuscate(`
    function factorial(n) {
      if (n <= 1) return 1;
      return n * factorial(n - 1);
    }
    window.TEST_OUTPUT = factorial(5);
  `);

  expect(await evalCode(code)).toBe(120);
});

test("Variant #9: Recursive function (fibonacci)", async () => {
  const { code } = await obfuscate(`
    function fib(n) {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    }
    window.TEST_OUTPUT = fib(8);
  `);

  expect(await evalCode(code)).toBe(21);
});

// Function expressions
test("Variant #10: Function expression assigned to a variable", async () => {
  const { code } = await obfuscate(`
    var double = function(x) { return x * 2; };
    window.TEST_OUTPUT = double(21);
  `);

  expect(await evalCode(code)).toBe(42);
});

test("Variant #11: Function expression passed as an argument (higher-order)", async () => {
  const { code } = await obfuscate(`
    function apply(fn, x) { return fn(x); }
    window.TEST_OUTPUT = apply(function(n) { return n * n; }, 7);
  `);

  expect(await evalCode(code)).toBe(49);
});

test("Variant #12: Immediately invoked function expression (IIFE)", async () => {
  const { code } = await obfuscate(`
    var result = (function(x, y) { return x + y; })(10, 32);
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe(42);
});

// this keyword
test("Variant #13: this is the receiver in a method call", async () => {
  const { code } = await obfuscate(`
    var obj = {
      name: "Alice",
      greet: function() { return "Hello, " + this.name; }
    };
    window.TEST_OUTPUT = obj.greet();
  `);

  expect(await evalCode(code)).toBe("Hello, Alice");
});

test("Variant #14: this is the new object inside a constructor", async () => {
  const { code } = await obfuscate(`
    function Person(name, age) {
      this.name = name;
      this.age  = age;
    }
    var p = new Person("Bob", 30);
    window.TEST_OUTPUT = [p.name, p.age];
  `);

  expect(await evalCode(code)).toEqual(["Bob", 30]);
});

// arguments object
test("Variant #15: arguments.length reflects the call-site arity", async () => {
  const { code } = await obfuscate(`
    function arity() { return arguments.length; }
    window.TEST_OUTPUT = [arity(), arity(1), arity(1, 2, 3)];
  `);

  expect(await evalCode(code)).toEqual([0, 1, 3]);
});

test("Variant #16: arguments can be indexed and iterated", async () => {
  const { code } = await obfuscate(`
    function sum() {
      var total = 0;
      var i = 0;
      while (i < arguments.length) {
        total = total + arguments[i];
        i++;
      }
      return total;
    }
    window.TEST_OUTPUT = sum(1, 2, 3, 4, 5);
  `);

  expect(await evalCode(code)).toBe(15);
});

// Rest parameters
test("Variant #17: Rest-only parameter collects all arguments into an array", async () => {
  const { code } = await obfuscate(`
    function sum(...nums) {
      var total = 0;
      for (var i = 0; i < nums.length; i++) total += nums[i];
      return total;
    }
    window.TEST_OUTPUT = sum(1, 2, 3, 4, 5);
  `);

  expect(await evalCode(code)).toBe(15);
});

test("Variant #18: Rest parameter with leading named params", async () => {
  const { code } = await obfuscate(`
    function buildMessage(prefix, ...words) {
      return prefix + ": " + words.join(", ");
    }
    window.TEST_OUTPUT = buildMessage("Colors", "red", "green", "blue");
  `);

  expect(await evalCode(code)).toBe("Colors: red, green, blue");
});

test("Variant #19: Rest parameter receives empty array when no extra args are passed", async () => {
  const { code } = await obfuscate(`
    function first(a, ...rest) {
      return [a, rest.length];
    }
    window.TEST_OUTPUT = first(42);
  `);

  expect(await evalCode(code)).toEqual([42, 0]);
});

test("Variant #20: Nested functions each with their own rest parameters", async () => {
  const { code } = await obfuscate(`
    function outer(...outerArgs) {
      function inner(...innerArgs) {
        return outerArgs.concat(innerArgs);
      }
      return inner;
    }
    var fn = outer(1, 2);
    window.TEST_OUTPUT = fn(3, 4);
  `);

  expect(await evalCode(code)).toEqual([1, 2, 3, 4]);
});

test("Variant #21: Deeply nested rest functions all receive correct slices", async () => {
  const { code } = await obfuscate(`
    function a(...as) {
      function b(...bs) {
        function c(...cs) {
          return [as, bs, cs];
        }
        return c;
      }
      return b;
    }
    window.TEST_OUTPUT = a(1)(2, 3)(4, 5, 6);
  `);

  expect(await evalCode(code)).toEqual([[1], [2, 3], [4, 5, 6]]);
});
