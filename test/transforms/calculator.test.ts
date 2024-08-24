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
  var code = `input((40 * 35 + 4) * 4 + 2)`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    calculator: true,
  });

  var value;
  function input(x) {
    value = x;
  }

  eval(output);

  expect(value).toStrictEqual(5618);
});

test("Variant #4: Apply to unary operators", async () => {
  var code = `
  var one = +1;
  var negativeOne = -one;

  var trueValue = true;
  var falseValue = !trueValue;

  TEST_OUTPUT = typeof (1, falseValue) === "boolean" && negativeOne === ~~-1 && void 0 === undefined;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    calculator: true,
  });

  expect(output).toContain("_calc");
  expect(output).not.toContain("+1");
  expect(output).not.toContain("-one");
  expect(output).not.toContain("typeof(1,falseValue)");
  expect(output).not.toContain("void 0");

  var TEST_OUTPUT = true;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #5: Don't break typeof expressions", async () => {
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
