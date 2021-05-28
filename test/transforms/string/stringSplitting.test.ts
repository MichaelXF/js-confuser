import JsConfuser from "../../../src/index";

it("should split strings", async () => {
  var code = `var TEST_STRING = "the brown dog jumped over the lazy fox."`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringSplitting: true,
  });

  expect(output).not.toContain("the brown dog jumped over the lazy fox.");
});
