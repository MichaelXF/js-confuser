import JsConfuser from "../../../src/index";

it("should split strings", async () => {
  var code = `var TEST_STRING = "the brown dog jumped over the lazy fox."`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringSplitting: true,
  });

  expect(output).not.toContain("the brown dog jumped over the lazy fox.");
});

it("should split strings and concatenate correctly", async () => {
  var code = `input("the brown dog jumped over the lazy fox.")`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringSplitting: true,
  });

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  expect(output).not.toContain("the brown dog jumped over the lazy fox.");

  eval(output);

  expect(value).toStrictEqual("the brown dog jumped over the lazy fox.");
});
