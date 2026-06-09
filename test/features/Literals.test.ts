import { obfuscate, evalCode } from "../test-utils";

test("Variant #1: Boolean Literals", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [true, false];
  `);

  expect(await evalCode(code)).toEqual([true, false]);
});

test("Variant #2: String Literals", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = ["hello", "world"];
  `);

  expect(await evalCode(code)).toEqual(["hello", "world"]);
});

test("Variant #3: Numeric Literals", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [42, 3.14, NaN, Infinity, -Infinity];
  `);

  expect(await evalCode(code)).toEqual([42, 3.14, NaN, Infinity, -Infinity]);
});

test("Variant #4: Other Literals", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [null, undefined];
  `);

  expect(await evalCode(code)).toEqual([null, undefined]);
});

test("Variant #5: Array expressions", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = [1, "two", true, null, [3, 4], [[5]]];
  `);

  expect(await evalCode(code)).toEqual([1, "two", true, null, [3, 4], [[5]]]);
});

test("Variant #6: Object expressions", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = {
      a: 1,
      b: "two",
      c: true,
      d: null,
      e: [3, 4],
      f: { nested: "object", moreNested: { deeplyNested: {  } } }
    };
  `);

  expect(await evalCode(code)).toEqual({
    a: 1,
    b: "two",
    c: true,
    d: null,
    e: [3, 4],
    f: { nested: "object", moreNested: { deeplyNested: {} } },
  });
});

test("Variant #8: RegExp literal basic", async () => {
  const { code } = await obfuscate(`
    var re = /hello/;
    window.TEST_OUTPUT = [re instanceof RegExp, re.source, re.flags];
  `);

  expect(await evalCode(code)).toEqual([true, "hello", ""]);
});

test("Variant #9: RegExp literal with flags", async () => {
  const { code } = await obfuscate(`
    var re = /foo/gi;
    window.TEST_OUTPUT = [re.source, re.flags];
  `);

  expect(await evalCode(code)).toEqual(["foo", "gi"]);
});

test("Variant #10: RegExp literal test()", async () => {
  const { code } = await obfuscate(`
    var re = /^\\d+$/;
    window.TEST_OUTPUT = [re.test("123"), re.test("abc"), re.test("12x")];
  `);

  expect(await evalCode(code)).toEqual([true, false, false]);
});

test("Variant #11: RegExp literal exec() and match()", async () => {
  const { code } = await obfuscate(`
    var m = /(\\w+)\\s(\\w+)/.exec("Hello World");
    window.TEST_OUTPUT = [m[0], m[1], m[2]];
  `);

  expect(await evalCode(code)).toEqual(["Hello World", "Hello", "World"]);
});

test("Variant #12: RegExp literal stateful lastIndex with /g", async () => {
  const { code } = await obfuscate(`
    var re = /a/g;
    var s = "aXaX";
    var r1 = re.test(s);
    var i1 = re.lastIndex;
    var r2 = re.test(s);
    var i2 = re.lastIndex;
    window.TEST_OUTPUT = [r1, i1, r2, i2];
  `);

  expect(await evalCode(code)).toEqual([true, 1, true, 3]);
});

test("Variant #13: RegExp literal fresh object per evaluation", async () => {
  const { code } = await obfuscate(`
    // Each pass through the loop re-evaluates the literal -> fresh lastIndex
    var results = [];
    for (var i = 0; i < 3; i++) {
      var re = /x/g;
      results.push(re.lastIndex);
      re.test("x");
      results.push(re.lastIndex);
    }
    window.TEST_OUTPUT = results;
  `);

  // lastIndex starts at 0 each iteration because a new object is created
  expect(await evalCode(code)).toEqual([0, 1, 0, 1, 0, 1]);
});

test("Variant #7: Array and object runtime order", async () => {
  const { code } = await obfuscate(`
    var counter = 0;
    var increment = function (){return counter++;};

    var arr = [increment(), [increment(), increment(), increment()], increment(), [increment(), [increment()]]];
    var obj = { x: increment(), y: increment(), z: {
      a: increment(),
      b: increment(),
      c: increment(),
      d: {
        e: increment(),
      }
    },

    nested: {
      f: increment(),
      g: increment()
    }
    };

    window.TEST_OUTPUT = { arr, obj };
  `);

  var result = await evalCode(code);

  expect(result.arr).toEqual([0, [1, 2, 3], 4, [5, [6]]]);

  expect(result.obj).toEqual({
    x: 7,
    y: 8,
    z: {
      a: 9,
      b: 10,
      c: 11,
      d: {
        e: 12,
      },
    },
    nested: {
      f: 13,
      g: 14,
    },
  });
});
