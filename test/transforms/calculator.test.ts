import JsConfuser from "../../src/index";

test("Variant #1: Hide binary expressions", async () => {
  var code = `5 + 5`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    calculator: true,
  });

  expect(output).not.toContain("5+5");
  expect(output).not.toContain("5 + 5");
  expect(output).toContain("switch");
});

test("Variant #2: Result with correct values", async () => {
  var code = `input(5 + 5)`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    calculator: true,
  });

  function input(x) {
    expect(x).toStrictEqual(10);
  }

  eval(output);
});

test("Variant #3: Execute property with complex operations", async () => {
  var code = `input((40 * 35 + 4) * 4 + 2 + -20)`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    calculator: true,
  });

  var value;
  function input(x) {
    value = x;
  }

  eval(output);

  expect(value).toStrictEqual(5598);
});

test("Variant #4: Don't break typeof expressions", async () => {
  var code = `
    TEST_OUTPUT = typeof nonExistentVariable === "undefined";
    `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    calculator: true,
  });

  expect(output).not.toContain("_calc");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #5: Work with all binary operators", async () => {
  var code = `
  let result = (
    (((5 + 3) * 2 - (6 / 3) % 4 + (10 ** 2) - (8 << 2) + (256 >> 3) | (15 & 7) ^ 12) * 3)
    + (42 | 24) 
    + ((9 & 5) ^ (2 ^ 1))
  ) + (14 * (18 >>> 2)) - ((35 * 2) | (7 & 3)) + (50 ^ 21) + (~5) + (9 << 1) - (100 >> 2);

  TEST_OUTPUT = result;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    calculator: true,
  });

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(440);
});
