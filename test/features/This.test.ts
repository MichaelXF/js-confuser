import { obfuscate, evalCode } from "../test-utils";

// ── Constructor functions ─────────────────────────────────────────

test("Variant #1: Constructor sets properties on `this` via new", async () => {
  const { code } = await obfuscate(`
    function Rectangle(width, height) {
      this.width = width;
      this.height = height;
      this.area = function() {
        return this.width * this.height;
      };
    }
    var r = new Rectangle(4, 5);
    window.TEST_OUTPUT = [r.width, r.height, r.area()];
  `);

  expect(await evalCode(code)).toEqual([4, 5, 20]);
});

// ── Object literal method this ────────────────────────────────────

test("Variant #2: Object literal method receives object as `this`", async () => {
  const { code } = await obfuscate(`
    var counter = {
      count: 0,
      increment: function() {
        this.count = this.count + 1;
        return this.count;
      }
    };
    counter.increment();
    counter.increment();
    window.TEST_OUTPUT = counter.increment();
  `);

  expect(await evalCode(code)).toBe(3);
});

// ── Prototype methods ─────────────────────────────────────────────

test("Variant #3: Prototype methods receive instance as `this`", async () => {
  const { code } = await obfuscate(`
    function Stack() {
      this.items = [];
    }
    Stack.prototype.push = function(item) {
      this.items.push(item);
    };
    Stack.prototype.pop = function() {
      return this.items.pop();
    };
    Stack.prototype.size = function() {
      return this.items.length;
    };

    var s = new Stack();
    s.push(10);
    s.push(20);
    s.push(30);
    window.TEST_OUTPUT = [s.size(), s.pop(), s.size()];
  `);

  expect(await evalCode(code)).toEqual([3, 30, 2]);
});

// ── ES5 class extending ───────────────────────────────────────────

test("Variant #4: ES5 inheritance via Function.call forwards `this` to parent constructor", async () => {
  const { code } = await obfuscate(`
    function Animal(name) {
      this.name = name;
      this.type = "animal";
    }

    function Dog(name, breed) {
      Animal.call(this, name);
      this.type = "dog";
      this.breed = breed;
    }
    Dog.prototype.describe = function() {
      return this.name + " is a " + this.breed;
    };

    var d = new Dog("Rex", "Labrador");
    window.TEST_OUTPUT = [d.name, d.type, d.breed, d.describe()];
  `);

  expect(await evalCode(code)).toEqual([
    "Rex",
    "dog",
    "Labrador",
    "Rex is a Labrador",
  ]);
});

// ── Exposed globals ───────────────────────────────────────────────

test("Variant #5: Function assigned to window called as method receives window as `this`", async () => {
  const { code } = await obfuscate(`
    window.appName = "MyApp";
    function getAppName() {
      return this.appName;
    }
    window.getAppName = getAppName;
    window.TEST_OUTPUT = window.getAppName();
  `);

  expect(await evalCode(code)).toBe("MyApp");
});

// ── call() ────────────────────────────────────────────────────────

test("Variant #7: call() invokes function with explicit this", async () => {
  const { code } = await obfuscate(`
    function greet(greeting) {
      return greeting + ", " + this.name;
    }
    var obj = { name: "Alice" };
    window.TEST_OUTPUT = greet.call(obj, "Hello");
  `);

  expect(await evalCode(code)).toBe("Hello, Alice");
});

test("Variant #8: call() with multiple arguments", async () => {
  const { code } = await obfuscate(`
    function add(a, b, c) {
      return this.base + a + b + c;
    }
    var obj = { base: 10 };
    window.TEST_OUTPUT = add.call(obj, 1, 2, 3);
  `);

  expect(await evalCode(code)).toBe(16);
});

test("Variant #9: call() used for method borrowing", async () => {
  const { code } = await obfuscate(`
    var dog = { name: "Rex", sound: "woof" };
    var cat = { name: "Whiskers", sound: "meow" };
    function speak() {
      return this.name + " says " + this.sound;
    }
    window.TEST_OUTPUT = [speak.call(dog), speak.call(cat)];
  `);

  expect(await evalCode(code)).toEqual(["Rex says woof", "Whiskers says meow"]);
});

// ── apply() ───────────────────────────────────────────────────────

test("Variant #10: apply() invokes function with explicit this and args array", async () => {
  const { code } = await obfuscate(`
    function greet(greeting, punctuation) {
      return greeting + ", " + this.name + punctuation;
    }
    var obj = { name: "Bob" };
    window.TEST_OUTPUT = greet.apply(obj, ["Hi", "!"]);
  `);

  expect(await evalCode(code)).toBe("Hi, Bob!");
});

test("Variant #11: apply() with Math.max to spread an array", async () => {
  const { code } = await obfuscate(`
    var nums = [3, 1, 4, 1, 5, 9, 2, 6];
    window.TEST_OUTPUT = Math.max.apply(null, nums);
  `);

  expect(await evalCode(code)).toBe(9);
});

test("Variant #12: apply() used for constructor chaining", async () => {
  const { code } = await obfuscate(`
    function Base(x, y) {
      this.x = x;
      this.y = y;
    }
    function Point(x, y, label) {
      Base.apply(this, [x, y]);
      this.label = label;
    }
    var p = new Point(3, 4, "P");
    window.TEST_OUTPUT = [p.x, p.y, p.label];
  `);

  expect(await evalCode(code)).toEqual([3, 4, "P"]);
});

// ── bind() ────────────────────────────────────────────────────────

test("Variant #13: bind() returns a function with fixed this", async () => {
  const { code } = await obfuscate(`
    function getName() {
      return this.name;
    }
    var obj = { name: "Carol" };
    var boundGet = getName.bind(obj);
    window.TEST_OUTPUT = boundGet();
  `);

  expect(await evalCode(code)).toBe("Carol");
});

test("Variant #14: bind() with pre-filled arguments (partial application)", async () => {
  const { code } = await obfuscate(`
    function multiply(a, b) {
      return a * b;
    }
    var double = multiply.bind(null, 2);
    window.TEST_OUTPUT = [double(3), double(5), double(10)];
  `);

  expect(await evalCode(code)).toEqual([6, 10, 20]);
});

test("Variant #15: bind() preserves this through setTimeout-style callbacks", async () => {
  const { code } = await obfuscate(`
    function Timer() {
      this.ticks = 0;
    }
    Timer.prototype.tick = function() {
      this.ticks = this.ticks + 1;
      return this.ticks;
    };
    var t = new Timer();
    var boundTick = t.tick.bind(t);
    boundTick();
    boundTick();
    window.TEST_OUTPUT = boundTick();
  `);

  expect(await evalCode(code)).toBe(3);
});

// ── null/undefined thisArg → global object (sloppy mode) ─────────

test("Variant #16: call(null) passes global object as this", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = (function() {
      this.callNullResult = 42;
      return this.callNullResult;
    }).call(null);
  `);

  expect(await evalCode(code)).toBe(42);
});

test("Variant #17: apply(undefined) passes global object as this", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = (function() {
      this.applyUndefinedResult = 99;
      return this.applyUndefinedResult;
    }).apply(undefined);
  `);

  expect(await evalCode(code)).toBe(99);
});

test("Variant #18: plain function call receives global object as this", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = (function() {
      this.plainCallResult = 7;
      return this.plainCallResult;
    })();
  `);

  expect(await evalCode(code)).toBe(7);
});

// ── Method chaining (return this) ────────────────────────────────

test("Variant #6: Returning `this` from prototype methods enables chaining", async () => {
  const { code } = await obfuscate(`
    function Builder() {
      this.value = 0;
    }
    Builder.prototype.add = function(n) {
      this.value = this.value + n;
      return this;
    };
    Builder.prototype.multiply = function(n) {
      this.value = this.value * n;
      return this;
    };
    Builder.prototype.result = function() {
      return this.value;
    };

    var b = new Builder();
    window.TEST_OUTPUT = b.add(5).multiply(3).add(2).result();
  `);

  // (0 + 5) * 3 + 2 = 17
  expect(await evalCode(code)).toBe(17);
});
