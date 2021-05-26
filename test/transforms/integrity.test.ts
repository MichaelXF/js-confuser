import JsConfuser from "../../src/index";

it("should still run correctly", async () => {
  var code = `
  function TEST_FUNCTION(){
    input(true) 
  }

  TEST_FUNCTION();
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    lock: { integrity: true },
  });

  expect(output).toContain("function");

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual(true);
});

it("should not run when source code is modified", async () => {
  var code = `
  function TEST_FUNCTION(){
    input("Hello World") 
  }

  TEST_FUNCTION();
  
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    lock: { integrity: true },
  });

  expect(output).toContain("function");

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  // Change the "Hello World" to "Goodnight"
  output = output.replace("Hello World", "Goodnight");
  console.log(output);

  eval(output);

  expect(value).not.toEqual("Goodnight");

  expect(value).toBeUndefined();
});
