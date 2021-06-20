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

        var answer = TEST_NESTED_FUNCTION();
        input(answer)
        function TEST_NESTED_FUNCTION(){
          return 65;
        }
      }

      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).toContain("TEST_NESTED_FUNCTION");
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
  expect(output).toContain("class");
  expect(output).toContain("...");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual("Value");
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

it("should work even when differing amount of arguments passed in", async () => {
  var output = await JsConfuser(
    `
      function add3(x, y, z){
        return x + y;
      }
      
      input(add3(10, 15), add3(10, 15, 30))
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("x");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(25);
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

it("should guess execution order correctly (CallExpression, arguments run before callee)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(a,b){
        var TEST_NESTED_FUNCTION = (x,y)=>{
          input(x + y)
        }
        
        TEST_NESTED_FUNCTION(a,b)
      }
      
      TEST_FUNCTION(10, 15)
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("TEST_NESTED_FUNCTION");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(25);
});

it("should guess execution order correctly (AssignmentExpression, right side executes first)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(a,b){
        
        var C;
        C = a + b;
        input(C)
        
      }
      
      TEST_FUNCTION(10, 15)
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("C=");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(25);
});

it("should not entangle floats or NaN", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        
        var a = NaN;
        input(10.01 + 15.01)
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).toContain("10.01");
  expect(output).toContain("15.01");
  expect(output).toContain("NaN");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(25.02);
});
