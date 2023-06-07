import JsConfuser from "../../src/index";

test("Variant #1: Positive integer", async () => {
  var output = await JsConfuser.obfuscate(`TEST_VAR = 10;`, {
    target: "node",
    numberConcealing: true,
    compact: false,
  });

  expect(output).not.toContain(" 10;");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual(10);
});

test("Variant #2: Negative integer", async () => {
  var output = await JsConfuser.obfuscate(`TEST_VAR = -10;`, {
    target: "node",
    numberConcealing: true,
    compact: false,
  });

  expect(output).not.toContain(" -10;");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual(-10);
});

test("Variant #3: Floats", async () => {
  var output = await JsConfuser.obfuscate(`TEST_VAR = [15.5, -75.9];`, {
    target: "node",
    numberConcealing: true,
    compact: false,
  });

  expect(output).toMatch(/\de/i);
  expect(output).not.toContain("15.5");
  expect(output).not.toContain("-75.9");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual([15.5, -75.9]);
});

test("Variant #4: Work even on large numbers", async () => {
  var output = await JsConfuser.obfuscate(
    `TEST_VAR = 10000000000000000000000000000;`,
    {
      target: "node",
      numberConcealing: true,
      compact: false,
    }
  );

  expect(output).toContain("1e+28");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual(10000000000000000000000000000);
});

test("Variant #5: Work with BigInt", async () => {
  var output = await JsConfuser.obfuscate(
    `TEST_VAR = 10000000000000000000000000000n;`,
    {
      target: "node",
      numberConcealing: true,
      compact: false,
    }
  );

  expect(output).toContain("10000000000000000000000000000n");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual(10000000000000000000000000000n);
});

test("Variant #6: Special case", async () => {
  var output = await JsConfuser.obfuscate(
    `TEST_VAR = 1;`,
    {
      target: "node",
      numberConcealing: true,
      compact: false,
    }
  );

  expect(output).not.toContain(" 1;");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual(1);
});

test("Variant #7: As key", async () => {
  var output = await JsConfuser.obfuscate(
    `TEST_VAR = { 1337: 42069 };`,
    {
      target: "node",
      numberConcealing: true,
      compact: false,
    }
  );

  expect(output).not.toContain(" 1337: ");
  expect(output).not.toContain(": 42069");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR).toStrictEqual({
    1337: 42069
  });
});

test("Variant #8: As method", async () => {
  var output = await JsConfuser.obfuscate(
    `class TEST_CLASS { 1337() { return 42069; } }; TEST_VAR = new TEST_CLASS()`,
    {
      target: "node",
      numberConcealing: true,
      compact: false,
    }
  );

  expect(output).not.toContain("1337");
  expect(output).not.toContain(" return 42069");

  var TEST_VAR;

  eval(output);

  expect(TEST_VAR[1337]()).toStrictEqual(42069);
});
