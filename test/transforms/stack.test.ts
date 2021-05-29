import JsConfuser from "../../src/index";

it("should replace all variables with array indexes (single variable)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        var TEST_VARIABLE = 1;

        input(TEST_VARIABLE)
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("TEST_VARIABLE");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(1);
});

it("should replace all variables with array indexes (multiple variables)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        var TEST_VARIABLE_1 = 5;
        var TEST_VARIABLE_2 = 10;

        input(TEST_VARIABLE_1 + TEST_VARIABLE_2)
      }

      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("TEST_VARIABLE");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(15);
});

it("should replace all variables with array indexes (parameters)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(TEST_VARIABLE_1, TEST_VARIABLE_2){

        input(TEST_VARIABLE_1 + TEST_VARIABLE_2)
      }

      TEST_FUNCTION(50, 25)
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("TEST_VARIABLE");
  expect(output).toContain("...");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(75);
});

it("should only replace variables defined within the function, and not run if any changes can be made", async () => {
  var output = await JsConfuser(
    `
      var TEST_VARIABLE = 0;
      function TEST_FUNCTION(){

        TEST_VARIABLE;
      }
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).toContain("TEST_VARIABLE");
  expect(output).not.toContain("...");
});

it("should use '.shift' when defining the first item", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){

        var TEST_VARIABLE_1 = 100;
        return TEST_VARIABLE_1;
      }

      input(TEST_FUNCTION())
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).toContain("shift");
  expect(output).toContain("...");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(100);
});

it("should use '.push' when defining the last item", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){

        var TEST_VARIABLE_1 = 25;
        var TEST_VARIABLE_2 = 20;
        return TEST_VARIABLE_2 + TEST_VARIABLE_1;
      }

      input(TEST_FUNCTION())
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).toContain("push");
  expect(output).toContain("...");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(45);
});
