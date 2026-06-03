import { obfuscate, evalCode } from "../test-utils";

// ── Basic Getter ───────────────────────────────────────────────────

test("Variant #1: Basic getter — returns a constant", async () => {
  const { code } = await obfuscate(`
    var obj = {
      get value() { return 42; }
    };
    window.TEST_OUTPUT = obj.value;
  `);

  expect(await evalCode(code)).toBe(42);
});

test("Variant #2: Getter reads from a private property via this", async () => {
  const { code } = await obfuscate(`
    var person = {
      _name: "Alice",
      get name() { return this._name; }
    };
    window.TEST_OUTPUT = person.name;
  `);

  expect(await evalCode(code)).toBe("Alice");
});

test("Variant #3: Getter computes a value from regular properties", async () => {
  const { code } = await obfuscate(`
    var rect = {
      width: 4,
      height: 5,
      get area() { return this.width * this.height; }
    };
    window.TEST_OUTPUT = rect.area;
  `);

  expect(await evalCode(code)).toBe(20);
});

// ── Basic Setter ───────────────────────────────────────────────────

test("Variant #4: Basic setter — stores a value via this", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _x: 0,
      set x(v) { this._x = v; }
    };
    obj.x = 99;
    window.TEST_OUTPUT = obj._x;
  `);

  expect(await evalCode(code)).toBe(99);
});

test("Variant #5: Setter with conditional logic — clamps to range", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _count: 0,
      set count(v) { this._count = v < 0 ? 0 : v; }
    };
    obj.count = -5;
    window.TEST_OUTPUT = obj._count;
  `);

  expect(await evalCode(code)).toBe(0);
});

// ── Getter + Setter pair ───────────────────────────────────────────

test("Variant #6: Getter and setter on the same property — roundtrip", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _val: 0,
      get val() { return this._val; },
      set val(v) { this._val = v; }
    };
    obj.val = 7;
    window.TEST_OUTPUT = obj.val;
  `);

  expect(await evalCode(code)).toBe(7);
});

test("Variant #7: Setter updates state, getter reflects the change", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _firstName: "John",
      _lastName: "Doe",
      set firstName(v) { this._firstName = v; },
      get fullName() { return this._firstName + " " + this._lastName; }
    };
    obj.firstName = "Jane";
    window.TEST_OUTPUT = obj.fullName;
  `);

  expect(await evalCode(code)).toBe("Jane Doe");
});

test("Variant #8: Getter + setter with validation — rejects invalid values", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _age: 0,
      get age() { return this._age; },
      set age(v) {
        if (v >= 0 && v <= 150) {
          this._age = v;
        }
      }
    };
    obj.age = 25;
    obj.age = -1;
    window.TEST_OUTPUT = obj.age;
  `);

  expect(await evalCode(code)).toBe(25);
});

// ── Multiple accessors ─────────────────────────────────────────────

test("Variant #9: Multiple getters on the same object", async () => {
  const { code } = await obfuscate(`
    var obj = {
      x: 3,
      y: 4,
      get sum() { return this.x + this.y; },
      get product() { return this.x * this.y; }
    };
    window.TEST_OUTPUT = [obj.sum, obj.product];
  `);

  expect(await evalCode(code)).toEqual([7, 12]);
});

// ── Enumerability ──────────────────────────────────────────────────

test("Variant #10: Getter property is enumerable (appears in for..in)", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _x: 1,
      get x() { return this._x; }
    };
    var keys = [];
    for (var k in obj) { keys[keys.length] = k; }
    window.TEST_OUTPUT = keys.indexOf("x") !== -1;
  `);

  expect(await evalCode(code)).toBe(true);
});

// ── Mixed object with accessors and data properties ────────────────

test("Variant #11: Object with data properties and a getter", async () => {
  const { code } = await obfuscate(`
    var circle = {
      _radius: 5,
      label: "circle",
      get radius() { return this._radius; },
      get circumference() { return 2 * 3 * this._radius; }
    };
    window.TEST_OUTPUT = [circle.label, circle.radius, circle.circumference];
  `);

  expect(await evalCode(code)).toEqual(["circle", 5, 30]);
});

// ── String key getters ─────────────────────────────────────────────

test("Variant #12: Getter with string literal key", async () => {
  const { code } = await obfuscate(`
    var obj = {
      _v: 99,
      get "value"() { return this._v; }
    };
    window.TEST_OUTPUT = obj.value;
  `);

  expect(await evalCode(code)).toBe(99);
});
