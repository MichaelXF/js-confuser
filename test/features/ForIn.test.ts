import { obfuscate, evalCode } from "../test-utils";

// ── For..In ───────────────────────────────────────────────────────

test("Variant #1: For-in — own enumerable keys of a plain object", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2, c: 3 };
    var keys = [];
    for (var k in obj) {
      keys.push(k);
    }
    window.TEST_OUTPUT = keys.join(",");
  `);

  expect(await evalCode(code)).toBe("a,b,c");
});

test("Variant #2: For-in — values can be read via the key", async () => {
  const { code } = await obfuscate(`
    var obj = { x: 10, y: 20, z: 30 };
    var sum = 0;
    for (var k in obj) {
      sum = sum + obj[k];
    }
    window.TEST_OUTPUT = sum;
  `);

  expect(await evalCode(code)).toBe(60);
});

test("Variant #3: For-in — null object produces no iterations", async () => {
  const { code } = await obfuscate(`
    var count = 0;
    for (var k in null) {
      count++;
    }
    window.TEST_OUTPUT = count;
  `);

  expect(await evalCode(code)).toBe(0);
});

test("Variant #4: For-in — undefined object produces no iterations", async () => {
  const { code } = await obfuscate(`
    var count = 0;
    for (var k in undefined) {
      count++;
    }
    window.TEST_OUTPUT = count;
  `);

  expect(await evalCode(code)).toBe(0);
});

test("Variant #5: For-in — empty object produces no iterations", async () => {
  const { code } = await obfuscate(`
    var count = 0;
    for (var k in {}) {
      count++;
    }
    window.TEST_OUTPUT = count;
  `);

  expect(await evalCode(code)).toBe(0);
});

test("Variant #6: For-in — array yields string indices only (not length)", async () => {
  const { code } = await obfuscate(`
    var arr = [10, 20, 30];
    var keys = [];
    for (var k in arr) {
      keys.push(k);
    }
    window.TEST_OUTPUT = keys.join(",");
  `);

  // length is non-enumerable; indices are enumerable strings
  expect(await evalCode(code)).toBe("0,1,2");
});

test("Variant #7: For-in — inherited enumerable properties are included", async () => {
  const { code } = await obfuscate(`
    function Animal(name) { this.name = name; }
    Animal.prototype.type = "animal";
    var dog = new Animal("rex");
    var keys = [];
    for (var k in dog) {
      keys.push(k);
    }
    window.TEST_OUTPUT = keys.join(",");
  `);

  // own property first, then prototype property
  expect(await evalCode(code)).toBe("name,type");
});

test("Variant #8: For-in — non-enumerable built-in prototype properties are excluded", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2 };
    var count = 0;
    for (var k in obj) {
      count++;
    }
    window.TEST_OUTPUT = count;
  `);

  // Only own 2 keys — toString, hasOwnProperty etc. must NOT appear
  expect(await evalCode(code)).toBe(2);
});

test("Variant #9: For-in — shadowed prototype property appears only once", async () => {
  const { code } = await obfuscate(`
    function Base() {}
    Base.prototype.x = "proto";
    var child = new Base();
    child.x = "own";
    var keys = [];
    for (var k in child) {
      keys.push(k);
    }
    window.TEST_OUTPUT = keys.length;
  `);

  // "x" from own shadows prototype "x" — should appear exactly once
  expect(await evalCode(code)).toBe(1);
});

test("Variant #10: For-in — break exits the loop early", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2, c: 3 };
    var found = null;
    for (var k in obj) {
      if (obj[k] === 2) {
        found = k;
        break;
      }
    }
    window.TEST_OUTPUT = found;
  `);

  expect(await evalCode(code)).toBe("b");
});

test("Variant #11: For-in — continue skips to the next key", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2, c: 3 };
    var result = [];
    for (var k in obj) {
      if (k === "b") continue;
      result.push(k);
    }
    window.TEST_OUTPUT = result.join(",");
  `);

  expect(await evalCode(code)).toBe("a,c");
});

test("Variant #12: For-in — nested for-in loops", async () => {
  const { code } = await obfuscate(`
    var outer = { x: 1, y: 2 };
    var inner = { p: 3, q: 4 };
    var pairs = [];
    for (var k1 in outer) {
      for (var k2 in inner) {
        pairs.push(k1 + k2);
      }
    }
    window.TEST_OUTPUT = pairs.join(",");
  `);

  expect(await evalCode(code)).toBe("xp,xq,yp,yq");
});

test("Variant #13: For-in — loop variable without var declaration", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2 };
    var k;
    var keys = [];
    for (k in obj) {
      keys.push(k);
    }
    window.TEST_OUTPUT = keys.join(",");
  `);

  expect(await evalCode(code)).toBe("a,b");
});

test("Variant #14: For-in — works inside a function", async () => {
  const { code } = await obfuscate(`
    function collectKeys(obj) {
      var result = [];
      for (var k in obj) {
        result.push(k);
      }
      return result;
    }
    window.TEST_OUTPUT = collectKeys({ one: 1, two: 2, three: 3 }).join(",");
  `);

  expect(await evalCode(code)).toBe("one,two,three");
});

test("Variant #15: For-in — multiple sequential for-in loops work independently", async () => {
  const { code } = await obfuscate(`
    var a = { x: 1 };
    var b = { y: 2 };
    var first = [];
    var second = [];
    for (var k in a) { first.push(k); }
    for (var k in b) { second.push(k); }
    window.TEST_OUTPUT = first.join(",") + "|" + second.join(",");
  `);

  expect(await evalCode(code)).toBe("x|y");
});

test("Variant #16: For-in bare blockless body", async () => {
  const { code } = await obfuscate(`
    var obj = { a: 1, b: 2, c: 3, d: 4 };
    var keys = [];
    for (var k in obj) if (k !== "d") keys.push(k);
    window.TEST_OUTPUT = keys.join(",");  
  `);

  expect(await evalCode(code)).toBe("a,b,c");
});
