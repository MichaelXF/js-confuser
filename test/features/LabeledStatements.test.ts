import { obfuscate, evalCode } from "../test-utils";

test("Variant #1: break with label — exits outer for loop from inner loop", async () => {
  const { code } = await obfuscate(`
    var result = 0;
    outer: for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (i === 1 && j === 1) break outer;
        result++;
      }
    }
    window.TEST_OUTPUT = result;
  `);
  // i=0: j=0,1,2 → 3 increments
  // i=1: j=0 → 1 increment, then break outer at j=1
  // Total = 4
  expect(await evalCode(code)).toBe(4);
});

test("Variant #2: continue with label — skips rest of inner loop, continues outer for", async () => {
  const { code } = await obfuscate(`
    var result = 0;
    outer: for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (j === 1) continue outer;
        result++;
      }
    }
    window.TEST_OUTPUT = result;
  `);
  // Each outer iteration: j=0 runs (result++), j=1 → continue outer
  // 3 outer iterations × 1 inner increment = 3
  expect(await evalCode(code)).toBe(3);
});

test("Variant #3: labeled block — break exits the block early", async () => {
  const { code } = await obfuscate(`
    var x = 0;
    myBlock: {
      x = 1;
      break myBlock;
      x = 2;
    }
    window.TEST_OUTPUT = x;
  `);
  expect(await evalCode(code)).toBe(1);
});

test("Variant #4: labeled while — break exits from doubly-nested while", async () => {
  const { code } = await obfuscate(`
    var count = 0;
    outer: while (count < 10) {
      var inner = 0;
      while (inner < 10) {
        if (inner === 2) break outer;
        inner++;
      }
      count++;
    }
    window.TEST_OUTPUT = count;
  `);
  // inner goes 0,1 then break outer before count++ ever runs
  expect(await evalCode(code)).toBe(0);
});

test("Variant #5: continue outer — collects only j=0 of each outer iteration", async () => {
  const { code } = await obfuscate(`
    var log = [];
    outer: for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (j === 1) continue outer;
        log.push(i * 10 + j);
      }
    }
    window.TEST_OUTPUT = log;
  `);
  expect(await evalCode(code)).toEqual([0, 10, 20]);
});

test("Variant #6: labeled do-while — break exits from nested for loop", async () => {
  const { code } = await obfuscate(`
    var found = -1;
    var i = 0;
    outer: do {
      for (var j = 0; j < 5; j++) {
        if (i === 1 && j === 2) {
          found = i * 10 + j;
          break outer;
        }
      }
      i++;
    } while (i < 5);
    window.TEST_OUTPUT = found;
  `);
  expect(await evalCode(code)).toBe(12);
});

test("Variant #8: empty statement — no-op, surrounding code runs normally", async () => {
  const { code } = await obfuscate(`
    var x = 0;
    ;
    x = 5;
    ;
    window.TEST_OUTPUT = x;
  `);
  expect(await evalCode(code)).toBe(5);
});

test("Variant #9: labeled empty statement — compiles and runs without error", async () => {
  const { code } = await obfuscate(`
    var x = 1;
    emptyLabel: ;
    window.TEST_OUTPUT = x;
  `);
  expect(await evalCode(code)).toBe(1);
});

test("Variant #7: labeled block with no early break — code after runs normally", async () => {
  const { code } = await obfuscate(`
    var x = 0;
    skip: {
      x = 1;
      x = 2;
    }
    x = 3;
    window.TEST_OUTPUT = x;
  `);
  expect(await evalCode(code)).toBe(3);
});
