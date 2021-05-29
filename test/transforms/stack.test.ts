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

it("should replace all variables with array indexes (uninitialized variable are made undefined)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        var TEST_VARIABLE;

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
  expect(value).toStrictEqual(undefined);
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

it("should replace all variables with array indexes (nested function)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){

        function TEST_NESTED_FUNCTION(){
          return 65;
        }

        input(TEST_NESTED_FUNCTION())
      }

      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("TEST_NESTED_FUNCTION");
  expect(output).toContain("unshift");
  expect(output).toContain("...");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(65);
});

it("should replace all variables with array indexes (nested class)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){

        class TEST_CLASS {
          constructor(){

          }

          getValue(){
            return "Value"
          }
        }

        var instance = new TEST_CLASS();
        input(instance.getValue());
      }

      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).toContain("TEST_CLASS");
  expect(output).toContain("unshift");
  expect(output).toContain("class");
  expect(output).toContain("...");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual("Value");
});

it("should avoid rotation while in branched code", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(param){

        "START_SPLIT";
        if ( true ) {
          var A1 = 1;
          var A2 = 2;
          var A3 = 3;

          var sum = 1 + 2 + 3;
        }
        "END_SPLIT";

        input(param);
      }

      TEST_FUNCTION(100)
    `,
    {
      target: "node",
      stack: true,
    }
  );

  var branch = output.split("START_SPLIT")[1].split("END_SPLIT")[0];
  expect(branch).not.toContain("push");
  expect(branch).not.toContain("shift");
  expect(branch).not.toContain("unshift");
  expect(branch).not.toContain("pop");

  expect(output).toContain("shift");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(100);
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

it("should replace all variables with array indexes (middle indexes use array[index] syntax)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        var TEST_VARIABLE_1 = 1;
        var TEST_VARIABLE_2 = 2;
        var TEST_VARIABLE_3 = 3;


        TEST_VARIABLE_2 = "Updated";


        input(TEST_VARIABLE_2)
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("TEST_VARIABLE");
  expect(output).toContain("]='Updated'");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual("Updated");
});

it("should use '.unshift' when defining the first item", async () => {
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

  expect(output).toContain("unshift");
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
