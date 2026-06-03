import { obfuscate, evalCode } from "../test-utils";

// ── Binary: Arithmetic ────────────────────────────────────────────

test("Variant #1: Arithmetic binary operators (+, -, *, /, %)", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [2 + 3, 10 - 4, 3 * 4, 15 / 3, 10 % 3];
  `);

  expect(await evalCode(code)).toEqual([5, 6, 12, 5, 1]);
});

test("Variant #2: Bitwise binary operators (&, |, ^, <<, >>, >>>)", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [5 & 3, 5 | 3, 5 ^ 3, 1 << 3, 16 >> 2, -1 >>> 28];
  `);

  expect(await evalCode(code)).toEqual([1, 7, 6, 8, 4, 15]);
});

test("Variant #3: String concatenation with +", async () => {
  const { code } = await obfuscate(`
    var a = "hello";
    var b = " world";
    window.TEST_OUTPUT = a + b;
  `);

  expect(await evalCode(code)).toBe("hello world");
});

// ── Binary: Comparison ────────────────────────────────────────────

test("Variant #4: Comparison operators (<, >, <=, >=, ===, !==)", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [
      1 < 2,
      2 > 1,
      1 <= 1,
      2 >= 3,
      5 === 5,
      5 !== 4,
      "a" === "a",
      null === null,
      1 == "1",
      1 === "1",
      1 != "1",
      1 !== "1"
    ];
  `);

  expect(await evalCode(code)).toEqual([
    true,
    true,
    true,
    false,
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    true,
  ]);
});

// ── Binary: in / instanceof ───────────────────────────────────────

test("Variant #5: `in` operator", async () => {
  const { code } = await obfuscate(`
    var obj = { x: 1, y: 2 };
    window.TEST_OUTPUT = ["x" in obj, "y" in obj, "z" in obj];
  `);

  expect(await evalCode(code)).toEqual([true, true, false]);
});

test("Variant #6: `instanceof` operator", async () => {
  const { code } = await obfuscate(`
    function Animal(name) {
      this.name = name;
    }
    var a = new Animal("cat");
    var plain = {};
    window.TEST_OUTPUT = [a instanceof Animal, plain instanceof Animal];
  `);

  expect(await evalCode(code)).toEqual([true, false]);
});

// ── Logical ───────────────────────────────────────────────────────

test("Variant #7: Logical && — short-circuits on falsy LHS", async () => {
  const { code } = await obfuscate(`
    var sideEffect = 0;
    var r1 = false && (sideEffect = 1);
    var r2 = true  && "yes";
    window.TEST_OUTPUT = [r1, r2, sideEffect];
  `);

  // false && ... keeps false, skips RHS; true && "yes" evaluates to "yes"
  expect(await evalCode(code)).toEqual([false, "yes", 0]);
});

test("Variant #8: Logical || — short-circuits on truthy LHS", async () => {
  const { code } = await obfuscate(`
    var sideEffect = 0;
    var r1 = true  || (sideEffect = 1);
    var r2 = false || "fallback";
    window.TEST_OUTPUT = [r1, r2, sideEffect];
  `);

  // true || ... keeps true, skips RHS; false || "fallback" evaluates to "fallback"
  expect(await evalCode(code)).toEqual([true, "fallback", 0]);
});

// ── Unary ─────────────────────────────────────────────────────────

test("Variant #9: Arithmetic and boolean unary operators (-, +, !, ~)", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [-5, +(-3), !true, !false, ~0, ~(-1)];
  `);

  expect(await evalCode(code)).toEqual([-5, -3, false, true, -1, 0]);
});

test("Variant #10: typeof on primitives and undeclared variable", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [
      typeof 42,
      typeof "hello",
      typeof true,
      typeof null,
      typeof undefined,
      typeof {},
      typeof undeclaredVar
    ];
  `);

  expect(await evalCode(code)).toEqual([
    "number",
    "string",
    "boolean",
    "object",
    "undefined",
    "object",
    "undefined", // TYPEOF_SAFE — no throw for undeclared globals
  ]);
});

test("Variant #11: void and delete", async () => {
  const { code } = await obfuscate(`
    var obj = { x: 1, y: 2 };
    var d = delete obj.x;
    window.TEST_OUTPUT = [void 0, void "anything", d, "x" in obj, "y" in obj];
  `);

  expect(await evalCode(code)).toEqual([
    undefined,
    undefined,
    true,
    false,
    true,
  ]);
});

test("Variant #11b: delete with computed property key", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2, c: 3 };
    var key = "b";
    var d = delete obj[key];
    window.TEST_OUTPUT = [d, "a" in obj, "b" in obj, "c" in obj];
  `);

  expect(await evalCode(code)).toEqual([true, true, false, true]);
});

test("Variant #11c: delete result used inside an expression", async () => {
  // Regression: delete inside a binary expression used to leave a stale value
  // on the stack, causing the callee to be displaced and crash with
  // "callee.apply is not a function".
  const { code } = await obfuscate(`
    var obj = { x: 1 };
    var msg = "deleted=" + delete obj.x;
    var still = "x" in obj;
    window.TEST_OUTPUT = [msg, still];
  `);

  expect(await evalCode(code)).toEqual(["deleted=true", false]);
});

test("Variant #11d: delete non-existent property returns true", async () => {
  const { code } = await obfuscate(`
    var obj = { x: 1 };
    window.TEST_OUTPUT = [delete obj.z, delete obj.x, "x" in obj];
  `);

  expect(await evalCode(code)).toEqual([true, true, false]);
});

test("Variant #10b: typeof on local variable and function", async () => {
  const { code } = await obfuscate(`
    var n = 42;
    var s = "hi";
    var b = true;
    var u;
    function fn() {}
    var arr = [];
    window.TEST_OUTPUT = [
      typeof n,
      typeof s,
      typeof b,
      typeof u,
      typeof fn,
      typeof arr
    ];
  `);

  expect(await evalCode(code)).toEqual([
    "number",
    "string",
    "boolean",
    "undefined",
    "function",
    "object",
  ]);
});

// ── Update ────────────────────────────────────────────────────────

test("Variant #12: Update expressions (++ and --)", async () => {
  const { code } = await obfuscate(`
    var x = 5;
    x++;
    x++;
    x--;
    window.TEST_OUTPUT = x;
  `);

  expect(await evalCode(code)).toBe(6);
});

// ── Conditional ───────────────────────────────────────────────────

test("Variant #13: Conditional (ternary) expression", async () => {
  const { code } = await obfuscate(`
    var x = 10;
    window.TEST_OUTPUT = [
      x > 5  ? "big"  : "small",
      x < 5  ? "big"  : "small",
      true   ? 1      : 2,
      false  ? 1      : 2
    ];
  `);

  expect(await evalCode(code)).toEqual(["big", "small", 1, 2]);
});

// ── Assignment ────────────────────────────────────────────────────

test("Variant #14: Simple assignment — = is an expression", async () => {
  const { code } = await obfuscate(`
    var x;
    var result = (x = 42);
    window.TEST_OUTPUT = [x, result];
  `);

  expect(await evalCode(code)).toEqual([42, 42]);
});

test("Variant #15: Arithmetic compound assignments (+=, -=, *=, /=, %=)", async () => {
  const { code } = await obfuscate(`
    var x = 10;
    x += 5;
    x -= 3;
    x *= 2;
    x /= 4;
    x %= 4;
    window.TEST_OUTPUT = x;
  `);

  // 10 → 15 → 12 → 24 → 6 → 2
  expect(await evalCode(code)).toBe(2);
});

test("Variant #16: Bitwise compound assignments (&=, |=, ^=, <<=, >>=)", async () => {
  const { code } = await obfuscate(`
    var x = 0;
    x |= 0xFF;
    x &= 0x0F;
    x ^= 0x05;
    x <<= 2;
    x >>= 1;
    window.TEST_OUTPUT = x;
  `);

  // 0 → 255 → 15 → 10 → 40 → 20
  expect(await evalCode(code)).toBe(20);
});

test("Variant #17: Member assignment (dot and bracket notation)", async () => {
  const { code } = await obfuscate(`
    var obj = {};
    obj.x = 10;
    obj["y"] = 20;
    var arr = [0, 0, 0];
    arr[1] = 99;
    window.TEST_OUTPUT = [obj.x, obj.y, arr[1]];
  `);

  expect(await evalCode(code)).toEqual([10, 20, 99]);
});

test("Variant #18: Sequence expression", async () => {
  const { code } = await obfuscate(`
    var x = 0;
    var result = (x = x + 1, x * 2, x - 3);
    window.TEST_OUTPUT = [x, result];
  `);

  // x: 0 → 1; result: (1, 2, -2) evaluates to -2
  expect(await evalCode(code)).toEqual([1, -2]);
});
