import { obfuscate, evalCode } from "../test-utils";

// ── Basic switch with break ────────────────────────────────────

test("Variant #1: Basic match with break", async () => {
  const { code } = await obfuscate(`
    var x = 2;
    var result = "";
    switch (x) {
      case 1:
        result = "one";
        break;
      case 2:
        result = "two";
        break;
      case 3:
        result = "three";
        break;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("two");
});

test("Variant #2: Default case when no case matches", async () => {
  const { code } = await obfuscate(`
    var x = 99;
    var result = "";
    switch (x) {
      case 1:
        result = "one";
        break;
      case 2:
        result = "two";
        break;
      default:
        result = "default";
        break;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("default");
});

// ── Fall-through ──────────────────────────────────────────────

test("Variant #3: Fall-through without break", async () => {
  const { code } = await obfuscate(`
    var x = 1;
    var result = "";
    switch (x) {
      case 1:
        result = result + "a";
      case 2:
        result = result + "b";
        break;
      case 3:
        result = result + "c";
        break;
    }
    window.TEST_OUTPUT = result;
  `);

  // x === 1: case 1 body executes, falls through to case 2, break
  expect(await evalCode(code)).toBe("ab");
});

test("Variant #4: Multiple fall-through cases", async () => {
  const { code } = await obfuscate(`
    var x = 2;
    var result = "";
    switch (x) {
      case 1:
      case 2:
      case 3:
        result = "1-2-3";
        break;
      case 4:
        result = "4";
        break;
    }
    window.TEST_OUTPUT = result;
  `);

  // x === 2: jumps to case 2 (empty body), falls through to case 3 (empty), falls through to case 1 body
  expect(await evalCode(code)).toBe("1-2-3");
});

// ── No match / no default ──────────────────────────────────────

test("Variant #5: No match, no default (nothing executes)", async () => {
  const { code } = await obfuscate(`
    var x = 99;
    var result = "unchanged";
    switch (x) {
      case 1:
        result = "one";
        break;
      case 2:
        result = "two";
        break;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("unchanged");
});

// ── Default in the middle (order matters) ──────────────────────

test("Variant #6: Default in the middle with fall-through", async () => {
  const { code } = await obfuscate(`
    var x = 99;
    var result = "";
    switch (x) {
      case 1:
        result = result + "1";
        break;
      default:
        result = result + "d";
      case 2:
        result = result + "2";
        break;
    }
    window.TEST_OUTPUT = result;
  `);

  // x === 99 (no match): jumps to default, executes "d", falls through to case 2
  expect(await evalCode(code)).toBe("d2");
});

// ── Switch inside loops ────────────────────────────────────────

test("Variant #7: Switch inside a loop (break exits switch, not loop)", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    for (var i = 0; i < 3; i++) {
      switch (i) {
        case 0:
          sum = sum + 10;
          break;
        case 1:
          sum = sum + 20;
          break;
        case 2:
          sum = sum + 30;
          break;
      }
    }
    window.TEST_OUTPUT = sum;
  `);

  // Loop runs 3 times, break exits switch each time, loop continues: 10+20+30=60
  expect(await evalCode(code)).toBe(60);
});

test("Variant #8: Continue inside switch exits switch and continues loop", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    for (var i = 1; i <= 5; i++) {
      switch (i) {
        case 2:
        case 4:
          continue;  // Skip the sum for even numbers
        default:
          sum = sum + i;
      }
    }
    window.TEST_OUTPUT = sum;
  `);

  // i=1: default, sum=1; i=2: continue; i=3: default, sum=4; i=4: continue; i=5: default, sum=9
  expect(await evalCode(code)).toBe(9);
});

// ── Expression in switch discriminant ──────────────────────────

test("Variant #9: Expression in switch discriminant", async () => {
  const { code } = await obfuscate(`
    var x = 5;
    var result = "";
    switch (x * 2) {
      case 10:
        result = "ten";
        break;
      case 20:
        result = "twenty";
        break;
      default:
        result = "other";
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("ten");
});
