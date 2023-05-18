import JsConfuser from "../../src/index";

// https://github.com/MichaelXF/js-confuser/issues/79
test("Variant #1: Support BigInt Literals (1n)", async () => {
  var code = `
  TEST_OUTPUT = 1n;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    renameVariables: true,
  });

  var TEST_OUTPUT;
  eval(output);

  expect(typeof TEST_OUTPUT).toStrictEqual("bigint");
  expect(TEST_OUTPUT).toStrictEqual(1n);
});
