import { obfuscate, evalCode } from "../test-utils";

test("Variant #1: Throw — string literal propagates to host", async () => {
  const { code } = await obfuscate(`
    throw "boom";
  `);

  let caught;
  try {
    await evalCode(code);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBe("boom");
});

test("Variant #2: Throw — numeric value propagates", async () => {
  const { code } = await obfuscate(`
    throw 42;
  `);

  let caught;
  try {
    await evalCode(code);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBe(42);
});

test("Variant #3: Throw — Error object propagates", async () => {
  const { code } = await obfuscate(`
    throw new Error("something went wrong");
  `);

  let caught;
  try {
    await evalCode(code);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(Error);
  expect(caught.message).toBe("something went wrong");
});

test("Variant #4: Throw — from inside a function", async () => {
  const { code } = await obfuscate(`
    function fail() {
      throw "inner error";
    }
    fail();
  `);

  let caught;
  try {
    await evalCode(code);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBe("inner error");
});

test("Variant #5: Throw — conditional throw, executed branch throws", async () => {
  const { code } = await obfuscate(`
    var x = -1;
    if (x < 0) {
      throw "negative";
    }
    window.TEST_OUTPUT = "ok";
  `);

  let caught;
  try {
    await evalCode(code);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBe("negative");
});

test("Variant #6: Throw — conditional throw, non-executed branch does not throw", async () => {
  const { code } = await obfuscate(`
    var x = 1;
    if (x < 0) {
      throw "negative";
    }
    window.TEST_OUTPUT = "ok";
  `);

  expect(await evalCode(code)).toBe("ok");
});

test("Variant #7: Throw — expression is evaluated before throw", async () => {
  const { code } = await obfuscate(`
    var msg = "eval'd";
    throw msg;
  `);

  let caught;
  try {
    await evalCode(code);
  } catch (e) {
    caught = e;
  }
  expect(caught).toBe("eval'd");
});
