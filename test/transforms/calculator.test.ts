import JsConfuser from "../../src/index";

it("should hide binary expressions", async () => {
  var code = `5 + 5`;

  var output = await JsConfuser(code, { target: "browser", calculator: true });

  expect(output).not.toContain("5+5");
  expect(output).not.toContain("5 + 5");
  expect(output).toContain("switch");
});

it("should result with correct values", async () => {
  var code = `input(5 + 5)`;

  var output = await JsConfuser(code, { target: "browser", calculator: true });

  function input(x) {
    expect(x).toStrictEqual(10);
  }

  eval(output);
});

it("should execute property with complex operations", async () => {
  var code = `input((40 * 35 + 4) * 4 + 2)`;

  var output = await JsConfuser(code, { target: "browser", calculator: true });

  var value;
  function input(x) {
    value = x;
  }

  eval(output);

  expect(value).toStrictEqual(5618);
});

it("should apply to unary operators", async () => {
  var code = `
  var one = +1;
  var negativeOne = -one;

  var trueValue = true;
  var falseValue = !trueValue;

  TEST_OUTPUT = typeof (1, falseValue) === "boolean" && negativeOne === ~~-1 && void 0 === undefined;
  `;

  var output = await JsConfuser(code, { target: "node", calculator: true });

  expect(output).toContain("_calc");
  expect(output).not.toContain("+1");
  expect(output).not.toContain("-one");
  expect(output).not.toContain("typeof(1,falseValue)");
  expect(output).not.toContain("void 0");

  var TEST_OUTPUT = true;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

it("should not break typeof expressions", async () => {
  var code = `
    TEST_OUTPUT = typeof nonExistentVariable === "undefined";
    `;

  var output = await JsConfuser(code, { target: "node", calculator: true });

  expect(output).not.toContain("_calc");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});
