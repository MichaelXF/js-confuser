import JsConfuser from "../../src/index";

it("should conceal strings", async () => {
  var code = `var TEST_STRING = "Hello World"`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).not.toContain("Hello World");
});

it("should decode strings properly", async () => {
  var code = `
   var TEST_STRING = "Hello World"

   input(TEST_STRING);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).not.toContain("Hello World");

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual("Hello World");
});
