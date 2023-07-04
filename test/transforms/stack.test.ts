import JsConfuser from "../../src/index";

test("Variant #1: Replace all variables with array indexes (single variable)", async () => {
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

test("Variant #2: Replace all variables with array indexes (multiple variables)", async () => {
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

test("Variant #3: Replace all variables with array indexes (uninitialized variable are made undefined)", async () => {
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

test("Variant #4: Replace all variables with array indexes (parameters)", async () => {
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

test("Variant #5: Replace all variables with array indexes (nested function)", async () => {
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

test("Variant #6: Replace all variables with array indexes (nested class)", async () => {
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

test("Variant #7: Replace variables defined within the function, and not run if any changes can be made", async () => {
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

test("Variant #8: Work even when differing amount of arguments passed in", async () => {
  var output = await JsConfuser(
    `
      function add3(var_x, var_y, var_z){
        return var_x + var_y;
      }
      
      input(add3(10, 15), add3(10, 15, 30))
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("var_x");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(25);
});

test("Variant #9: Replace all variables with array indexes (middle indexes use array[index] syntax)", async () => {
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

test("Variant #10: Guess execution order correctly (CallExpression, arguments run before callee)", async () => {
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

test("Variant #11: Guess execution order correctly (AssignmentExpression, right side executes first)", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(a,b){
        
        var _C;
        _C = a + b;
        input(_C)
        
      }
      
      TEST_FUNCTION(10, 15)
    `,
    {
      target: "node",
      stack: true,
    }
  );

  expect(output).not.toContain("_C=");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(25);
});

test("Variant #12: Should not entangle floats or NaN", async () => {
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

test("Variant #13: Correctly entangle property keys", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){

        // filler expressions
        var var1 = 0;
        var var2 = 0;
        var var3 = 0;
        var var4 = 0;
        var var5 = 0;

        var obj = {
          10: 10,
          9: 9,
          8: 8,
          7: 7,
          6: 6,
          5: 5,
          4: 4,
          3: 3,
          2: 2,
          1: 1,
        }

        var ten = obj["5"] + obj["3"] + obj["2"];

        input(ten);
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(10);
});

test("Variant #14: Correctly entangle method definition keys", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){

        // filler expressions
        var var1 = 0;
        var var2 = 0;
        var var3 = 0;
        var var4 = 0;
        var var5 = 0;
          
        class TEST_CLASS {
          10(){
            return 10;
          }
          9(){
            return 9;
          }
          8(){
            return 8;
          }
          7(){
            return 7;
          }
          6(){
            return 6;
          }
          5(){
            return 5;
          }
          4(){
            return 4;
          }
          3(){
            return 3;
          }
          2(){
            return 2;
          }
          1(){
            return 2;
          }
        }
        
        var obj = new TEST_CLASS();
        var ten = obj["5"]() + obj["3"]() + obj["2"]();

        input(ten)
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      stack: true,
    }
  );

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(10);
});

test("Variant #15: Function with 'use strict' directive", async () => {
  var output = await JsConfuser(
    `
  function useStrictFunction(){
    'use strict';

    function fun(){
      return this;
    }

    var necessaryDeclarationForStackToApply;

    TEST_OUTPUT = fun() === undefined; // true
  }

  useStrictFunction();
  `,
    { target: "node", stack: true }
  );

  // Stack will not apply to functions with 'use strict' directive
  expect(output).not.toContain("_stack");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #16: Function with 'this'", async () => {
  var output = await JsConfuser(
    `
  'use strict';
  function stackFunction(){
    var necessaryDeclarationForStackToApply;

    function thisFunctionDeclaration(){
      return this;
    }

    var thisFunctionExpression1 = function(){
      return this;
    }

    var thisFunctionExpression2;

    thisFunctionExpression2 = function(){
      return this;
    }

    return thisFunctionDeclaration() || thisFunctionExpression1() || thisFunctionExpression2();
  }

  TEST_OUTPUT = stackFunction() === undefined;
  `,
    { target: "node", stack: true }
  );

  // Ensure stack applied
  expect(output).toContain("_stack");

  // Ensure 'thisFunction' was not changed by stack due to using 'this' keyword
  expect(output).toContain("function thisFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

// https://github.com/MichaelXF/js-confuser/issues/88
test("Variant #17: Syncing arguments parameter", async () => {
  var output = await JsConfuser(
    `
    var TEST_OUTPUT;

    function syncingArguments(parameter) {
      arguments[0] = "Correct Value";
      TEST_OUTPUT = parameter;
    }
    
    syncingArguments("Incorrect Value");
  `,
    { target: "node", stack: true }
  );

  function evalNoStrictMode(evalCode) {
    var fn = new Function(evalCode + ";return TEST_OUTPUT");
    return fn();
  }

  var TEST_OUTPUT = evalNoStrictMode(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #18: Preserve function.length property", async () => {
  var output = await JsConfuser(
    `
    function oneParameter(a){
      var _ = 1;
    };
    var twoParameters = function(a,b){
      var _ = 1;
    };
    var myObject = {
      threeParameters(a,b,c){
        var _ = 1;
      }
    }

    TEST_OUTPUT = oneParameter.length + twoParameters.length + myObject.threeParameters.length;
  `,
    { target: "node", stack: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(6);
});
