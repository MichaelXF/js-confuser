import { obfuscate, evalCode } from "../test-utils";

// ── While ─────────────────────────────────────────────────────────

test("Variant #1: While — accumulates a sum", async () => {
  const { code } = await obfuscate(`
    var i = 1;
    var sum = 0;
    while (i <= 10) {
      sum = sum + i;
      i++;
    }
    window.TEST_OUTPUT = sum;
  `);

  expect(await evalCode(code)).toBe(55);
});

test("Variant #2: While — condition false from the start, body never runs", async () => {
  const { code } = await obfuscate(`
    var result = "untouched";
    while (false) {
      result = "changed";
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toBe("untouched");
});

test("Variant #3: While — builds an array via index assignment", async () => {
  const { code } = await obfuscate(`
    var squares = [];
    var i = 0;
    while (i < 5) {
      squares[i] = i * i;
      i++;
    }
    window.TEST_OUTPUT = squares;
  `);

  expect(await evalCode(code)).toEqual([0, 1, 4, 9, 16]);
});

test("Variant #4: While — compound condition (&&)", async () => {
  const { code } = await obfuscate(`
    var i = 0;
    var j = 10;
    var count = 0;
    while (i < 5 && j > 5) {
      i++;
      j--;
      count++;
    }
    window.TEST_OUTPUT = count;
  `);

  // Both conditions satisfied for 5 iterations, then i=5 makes i<5 false
  expect(await evalCode(code)).toBe(5);
});

// ── Do-While ──────────────────────────────────────────────────────

test("Variant #5: Do-while — body executes at least once even when condition is false", async () => {
  const { code } = await obfuscate(`
    var ran = false;
    do {
      ran = true;
    } while (false);
    window.TEST_OUTPUT = ran;
  `);

  expect(await evalCode(code)).toBe(true);
});

test("Variant #6: Do-while — accumulates a sum", async () => {
  const { code } = await obfuscate(`
    var i = 1;
    var sum = 0;
    do {
      sum = sum + i;
      i++;
    } while (i <= 10);
    window.TEST_OUTPUT = sum;
  `);

  expect(await evalCode(code)).toBe(55);
});

test("Variant #7: Do-while — runs exactly N times, test at the bottom", async () => {
  const { code } = await obfuscate(`
    var count = 0;
    var i = 0;
    do {
      count++;
      i++;
    } while (i < 3);
    window.TEST_OUTPUT = count;
  `);

  expect(await evalCode(code)).toBe(3);
});

// ── For ───────────────────────────────────────────────────────────

test("Variant #8: For — basic sum with var init and ++ update", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    for (var i = 1; i <= 5; i++) {
      sum = sum + i;
    }
    window.TEST_OUTPUT = sum;
  `);

  expect(await evalCode(code)).toBe(15);
});

test("Variant #9: For — builds an array", async () => {
  const { code } = await obfuscate(`
    var result = [];
    for (var i = 0; i < 5; i++) {
      result[i] = i * 2;
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toEqual([0, 2, 4, 6, 8]);
});

test("Variant #10: For — bare expression init (not a var declaration)", async () => {
  const { code } = await obfuscate(`
    var i;
    var sum = 0;
    for (i = 0; i < 5; i++) {
      sum = sum + i;
    }
    window.TEST_OUTPUT = sum;
  `);

  // 0+1+2+3+4
  expect(await evalCode(code)).toBe(10);
});

test("Variant #11: For — no update clause", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    for (var i = 0; i < 5;) {
      sum = sum + i;
      i++;
    }
    window.TEST_OUTPUT = sum;
  `);

  expect(await evalCode(code)).toBe(10);
});

test("Variant #12: Nested for loops", async () => {
  const { code } = await obfuscate(`
    var result = [];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        result[i * 3 + j] = i * 10 + j;
      }
    }
    window.TEST_OUTPUT = result;
  `);

  expect(await evalCode(code)).toEqual([0, 1, 2, 10, 11, 12, 20, 21, 22]);
});

test("Variant #13: Loops with blockless bodies (no braces)", async () => {
  const { code } = await obfuscate(`
    var i = 0;
    var wSum = 0;
    var fSum = 0;
    var dSum = 0;
    while (i < 5) wSum = wSum + i++;
    for(var j = 0; j < 5; j++) fSum = fSum + j;
    do dSum = dSum + i++; while (i < 10);

    window.TEST_OUTPUT = [wSum, fSum, dSum];
  `);

  expect(await evalCode(code)).toEqual([10, 10, 35]);
});
