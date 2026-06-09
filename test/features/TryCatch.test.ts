import { obfuscate, evalCode } from "../test-utils";

// ── Basic try-catch ────────────────────────────────────────────────

test("Variant #1: Basic — catch receives thrown string", async () => {
  const { code } = await obfuscate(`
    var result = "none";
    try {
      throw "boom";
    } catch (e) {
      result = e;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("boom");
});

test("Variant #2: Try body completes normally — catch block not executed", async () => {
  const { code } = await obfuscate(`
    var result = "ok";
    try {
      result = "try";
    } catch (e) {
      result = "catch";
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("try");
});

test("Variant #3: Catch receives thrown number", async () => {
  const { code } = await obfuscate(`
    var result = 0;
    try {
      throw 42;
    } catch (e) {
      result = e;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe(42);
});

test("Variant #4: Catch receives thrown object", async () => {
  const { code } = await obfuscate(`
    var result = null;
    try {
      throw { code: 404, msg: "not found" };
    } catch (e) {
      result = e.code;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe(404);
});

test("Variant #5: Native TypeError caught (property access on null)", async () => {
  const { code } = await obfuscate(`
    var result = "none";
    try {
      var x = null;
      var y = x.property;
    } catch (e) {
      result = "caught";
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("caught");
});

test("Variant #6: Native Error object is instanceof Error in catch", async () => {
  const { code } = await obfuscate(`
    var result = false;
    try {
      null.boom;
    } catch (e) {
      result = e instanceof TypeError;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe(true);
});

// ── Nested try-catch ───────────────────────────────────────────────

test("Variant #7: Nested try-catch — inner catches its own throw", async () => {
  const { code } = await obfuscate(`
    var result = "";
    try {
      try {
        throw "inner";
      } catch (e) {
        result = "inner-" + e;
      }
      result = result + "-outer-ok";
    } catch (e) {
      result = "outer-caught";
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("inner-inner-outer-ok");
});

test("Variant #8: Nested try-catch — inner rethrows to outer catch", async () => {
  const { code } = await obfuscate(`
    var result = "none";
    try {
      try {
        throw "problem";
      } catch (e) {
        throw e + "-rethrown";
      }
    } catch (e) {
      result = e;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("problem-rethrown");
});

// ── Exception thrown inside a called function ──────────────────────

test("Variant #9: Exception propagates up from a called function", async () => {
  const { code } = await obfuscate(`
    function boom() {
      throw "from-fn";
    }
    var result = "none";
    try {
      boom();
    } catch (e) {
      result = e;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("from-fn");
});

test("Variant #10: Deep call stack unwind to catch", async () => {
  const { code } = await obfuscate(`
    function level3() { throw "deep"; }
    function level2() { level3(); }
    function level1() { level2(); }

    var result = "none";
    try {
      level1();
    } catch (e) {
      result = e;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("deep");
});

// ── Control flow through try-catch ────────────────────────────────

test("Variant #11: Code after try-catch executes when no throw", async () => {
  const { code } = await obfuscate(`
    var log = [];
    try {
      log[log.length] = "try";
    } catch (e) {
      log[log.length] = "catch";
    }
    log[log.length] = "after";
    window.TEST_OUTPUT = log;
  `);

  expect(await evalCode(code)).toEqual(["try", "after"]);
});

test("Variant #12: Code after try-catch executes after catch runs", async () => {
  const { code } = await obfuscate(`
    var log = [];
    try {
      log[log.length] = "try";
      throw "x";
    } catch (e) {
      log[log.length] = "catch";
    }
    log[log.length] = "after";
    window.TEST_OUTPUT = log;
  `);

  expect(await evalCode(code)).toEqual(["try", "catch", "after"]);
});

// ── Break/continue out of try inside a loop ────────────────────────

test("Variant #13: Break from inside a try block exits the loop cleanly", async () => {
  const { code } = await obfuscate(`
    var result = 0;
    for (var i = 0; i < 10; i++) {
      try {
        if (i === 3) break;
        result = i;
      } catch (e) {
        result = -1;
      }
    }
    window.TEST_OUTPUT = result;
  `);

  // Last value assigned before break is i=2; break fires when i=3
  expect(await evalCode(code)).toBe(2);
});

test("Variant #14: Continue from inside a try block skips the rest of the body", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    for (var i = 0; i < 5; i++) {
      try {
        if (i === 2) continue;
        sum = sum + i;
      } catch (e) {
        sum = -1;
      }
    }
    window.TEST_OUTPUT = sum;
  `);

  // 0 + 1 + (skip 2) + 3 + 4 = 8
  expect(await evalCode(code)).toBe(8);
});

// ── Return from inside try block ───────────────────────────────────

test("Variant #15: Return from inside try block works correctly", async () => {
  const { code } = await obfuscate(`
    function safe(x) {
      try {
        if (x < 0) return "negative";
        return "positive";
      } catch (e) {
        return "error";
      }
    }
    window.TEST_OUTPUT = safe(-1) + "," + safe(1);
  `);

  expect(await evalCode(code)).toBe("negative,positive");
});

// ── try-catch as expression guard ─────────────────────────────────

test("Variant #16: try-catch used as a value guard pattern", async () => {
  const { code } = await obfuscate(`
    function attempt(fn) {
      try {
        return fn();
      } catch (e) {
        return null;
      }
    }
    var a = attempt(function() { return 42; });
    var b = attempt(function() { throw "fail"; });
    window.TEST_OUTPUT = [a, b];
  `);

  expect(await evalCode(code)).toEqual([42, null]);
});
