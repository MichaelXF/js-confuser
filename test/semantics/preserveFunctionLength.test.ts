import JsConfuser from "../../src";

test("Variant #1: Enabled by default", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myFunction(a, b, c, d = "") {
    // Function.length = 3
  }

  TEST_OUTPUT = myFunction.length; // 3
  `,
    {
      target: "node",
      preset: "high",
    }
  );

  var TEST_OUTPUT;
  eval(output);
  expect(TEST_OUTPUT).toStrictEqual(3);
});

test("Variant #2: Disabled", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myFunction(a, b, c, d = "") {
    // Function.length = 3
  }

  TEST_OUTPUT = myFunction.length; // 3
  `,
    {
      target: "node",
      preset: "high",
      preserveFunctionLength: false,

      stringEncoding: false,
      stringCompression: false,
      stringConcealing: false,
      stringSplitting: false,
      deadCode: false,
      duplicateLiteralsRemoval: false,

      rgf: true,
    }
  );

  expect(output).not.toContain("defineProperty");

  var TEST_OUTPUT;
  eval(output);
  expect(TEST_OUTPUT).not.toStrictEqual(3);
});
