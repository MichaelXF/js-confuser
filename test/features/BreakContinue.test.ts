import { obfuscate, evalCode } from "../test-utils";

// break
test("Variant #1: break exits a while loop early", async () => {
  const { code } = await obfuscate(`
    var i = 0;
    while (true) {
      if (i === 5) break;
      i++;
    }
    window.TEST_OUTPUT = i;
  `);

  expect(await evalCode(code)).toBe(5);
});

test("Variant #2: break exits a for loop early", async () => {
  const { code } = await obfuscate(`
    var found = -1;
    for (var i = 0; i < 100; i++) {
      if (i === 7) {
        found = i;
        break;
      }
    }
    window.TEST_OUTPUT = found;
  `);

  expect(await evalCode(code)).toBe(7);
});

test("Variant #3: break exits a do-while loop early", async () => {
  const { code } = await obfuscate(`
    var i = 0;
    do {
      if (i === 3) break;
      i++;
    } while (true);
    window.TEST_OUTPUT = i;
  `);

  expect(await evalCode(code)).toBe(3);
});

// continue

test("Variant #4: continue in while skips rest of body, re-evaluates test", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    var i = 0;
    while (i < 10) {
      i++;
      if (i % 2 === 0) continue;
      sum = sum + i;
    }
    window.TEST_OUTPUT = sum;
  `);

  // odd numbers 1+3+5+7+9 = 25
  expect(await evalCode(code)).toBe(25);
});

test("Variant #5: continue in for loop still runs the update expression", async () => {
  const { code } = await obfuscate(`
    var visited = [];
    for (var i = 0; i < 5; i++) {
      if (i === 2) continue;
      visited[visited.length] = i;
    }
    window.TEST_OUTPUT = visited;
  `);

  // i=2 is skipped but i++ still runs → next iteration is i=3, not an infinite loop
  expect(await evalCode(code)).toEqual([0, 1, 3, 4]);
});

test("Variant #6: continue in do-while skips to the test", async () => {
  const { code } = await obfuscate(`
    var sum = 0;
    var i = 0;
    do {
      i++;
      if (i % 2 === 0) continue;
      sum = sum + i;
    } while (i < 10);
    window.TEST_OUTPUT = sum;
  `);

  // odd numbers 1+3+5+7+9 = 25
  expect(await evalCode(code)).toBe(25);
});

// nested loops
test("Variant #7: break only exits the innermost loop", async () => {
  const { code } = await obfuscate(`
    var result = [];
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (j === 1) break;
        result[result.length] = i * 10 + j;
      }
    }
    window.TEST_OUTPUT = result;
  `);

  // Only j=0 runs per outer iteration; outer loop continues normally
  expect(await evalCode(code)).toEqual([0, 10, 20]);
});

test("Variant #8: continue only affects the innermost loop", async () => {
  const { code } = await obfuscate(`
    var count = 0;
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (j === 1) continue;
        count++;
      }
    }
    window.TEST_OUTPUT = count;
  `);

  // j=0 and j=2 run per outer iteration: 3 * 2 = 6
  expect(await evalCode(code)).toBe(6);
});
