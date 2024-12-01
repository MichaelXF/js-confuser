import JsConfuser from "../../../src/index";

test("Variant #1: Add debugger statements", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    TEST_OUTPUT = true;`,
    {
      target: "node",
      lock: {
        antiDebug: true,
      },
    }
  );

  expect(output).toContain("debugger");

  var TEST_OUTPUT = false;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});
