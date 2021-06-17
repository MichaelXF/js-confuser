import JsConfuser from "../../src/index";

it("should put functions into eval statements", async () => {
  var code = `
    function TEST_FUNCTION(){
    }
  `;

  var output = await JsConfuser(code, { target: "node", eval: true });

  expect(output).toContain("eval(");
});

it("should put functions into eval statements and have same result", async () => {
  var code = `
    function TEST_FUNCTION(){
      input(100)
    }
    TEST_FUNCTION();
  `;

  var output = await JsConfuser(code, { target: "node", eval: true });

  expect(output).toContain("eval(");

  var value = "never_called",
    input = (valueIn) => (value = valueIn);
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should move function declarations to the top of the block", async () => {
  var code = `
    TEST_FUNCTION();
    function TEST_FUNCTION(){
      input(100)
    }
  `;

  var output = await JsConfuser(code, { target: "node", eval: true });

  expect(output).toContain("eval(");

  var value = "never_called",
    input = (valueIn) => (value = valueIn);
  eval(output);

  expect(value).toStrictEqual(100);
});
