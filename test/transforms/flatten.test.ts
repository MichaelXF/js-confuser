import JsConfuser from "../../src/index";

test("Variant #1: Function Declaration", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function myFunction(){
      return 10;
    }

    TEST_OUTPUT = myFunction();
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #2: Function Expression", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var outsideVar = "Correct Value";

    var myFunction = function(){
      return outsideVar;
    }

    TEST_OUTPUT = myFunction();
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #3: Simple parameters", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function myFunction(x, y){
      TEST_OUTPUT = x + y;
    }

    myFunction(10, 15);
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual(25);
});

test("Variant #4: Simple parameters nested", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(x){
      function TEST_NESTED_FUNCTION(y){
        input(y);
      }

      TEST_NESTED_FUNCTION(x)
    }

    TEST_FUNCTION(10);
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(10);
});

test("Variant #5: Correct return values when nested", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(){
      function TEST_NESTED_FUNCTION(){
        return 10;
      }

      return TEST_NESTED_FUNCTION()
    }

    input(TEST_FUNCTION());
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(10);
});

test("Variant #6: Correct values when deeply nested", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(x, y){
      function TEST_NESTED_FUNCTION(){

        function TEST_INNER_FUNCTION(a,b){
          return a + b;
        }

        return TEST_INNER_FUNCTION(x,y);
      }

      return TEST_NESTED_FUNCTION()
    }

    input(TEST_FUNCTION(10, 5));
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(15);
});

test("Variant #7: Correct values when modifying local variables", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(x, y){
      var A = 0;
      function TEST_NESTED_FUNCTION(){
        A++;
        A = A + 1;

        function TEST_INNER_FUNCTION(a,b){
          return a + b;
        }

        return TEST_INNER_FUNCTION(x,y);
      }

      return TEST_NESTED_FUNCTION() + A;
    }

    input(TEST_FUNCTION(10, 5));
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(17);
});

test("Variant #8: Work with dispatcher", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function container(x){
      function nested(x){
        return x * 10;
      }

      return nested(x);
    }

    input(container(10))
    `,
    {
      target: "node",
      flatten: true,
      dispatcher: true,
    }
  );

  var value = "never_called";
  function input(x) {
    value = x;
  }

  eval(output);
  expect(value).toStrictEqual(100);
});

// https://github.com/MichaelXF/js-confuser/issues/25
test("Variant #9: Work with pattern-based assignment expressions", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var i = 0;

    function change() {
      [([i] = [1])];
    }
    
    change();
    input(i);
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  // Ensure flatten was applied
  expect(output).toContain("_flat_");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(1);
});

test("Variant #10: Async function", async () => {
  var output = await JsConfuser.obfuscate(
    `
    async function timeout(ms){
      return await new Promise((resolve, reject)=>{
        setTimeout(()=>{
          resolve();
        }, ms);
      });
    }

    (async ()=>{
      var startTime = Date.now();

      await timeout(1000);

      var endTime = Date.now();

      var duration = endTime - startTime;

      TEST_CALLBACK(duration);
    })();
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_timeout");

  var wasCalled = false;
  var TEST_CALLBACK = (time) => {
    expect(time).toBeGreaterThan(500);
    wasCalled = true;
  };

  eval(output);

  setTimeout(() => {
    expect(wasCalled).toStrictEqual(true);
  }, 2000);
});

test("Variant #11: Work with properties", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var outsideVar = "Incorrect Value";

    var myObject = {
      myInitProperty: function(){
        return outsideVar;
      },

      myMethodProperty(){
        return;
      },

      get myGetProperty(){
        return;  
      },

      set mySetProperty(val){
        outsideVar = val;
      }
    }

    myObject.mySetProperty = "Correct Value";
    TEST_OUTPUT = myObject.myInitProperty();
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  // Ensure flatten applied
  expect(output).toContain("_flat_");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #12: Work with RGF enabled", async () => {
  var output = await JsConfuser.obfuscate(
    `
  var outsideVar = "Correct Value";

  function myFunction(){
    return outsideVar;
  }

  TEST_OUTPUT = myFunction();
  `,
    {
      target: "node",
      flatten: true,
      rgf: true,
    }
  );

  // Ensure flatten applied
  expect(output).toContain("_flat_myFunction");

  // Ensure RGF applied
  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #13: Work with assignment expression in the return statement", async () => {
  var output = await JsConfuser(
    `
  var outside;

  function myFunction(){
    return outside = "Correct Value"
  }

  myFunction(outside);

  TEST_OUTPUT = outside;
  
  `,
    { target: "node", flatten: true }
  );

  // Ensure flat was applied
  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #14: Work with 'use strict' directive", async () => {
  var output = await JsConfuser(
    `
  function myFunction(){
    "use strict";

    return "Correct Value";
  }

  TEST_OUTPUT = myFunction();
  `,
    { target: "node", flatten: true }
  );

  // Ensure flat was applied
  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

// https://github.com/MichaelXF/js-confuser/issues/89
test("Variant #15: Work with functions with invalid identifier names", async () => {
  var output = await JsConfuser(
    `
  // Input
  var object = {
    "my-function": function () {
      TEST_OUTPUT = "Success";
    },
  };

  object["my-function"](); // "Success"
  `,
    { target: "node", flatten: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Success");
});

test("Variant #16: Multiple test", async () => {
  var output = await JsConfuser(
    `
  "use strict";

  function assertLegalInvocation(){
    if(this !== undefined) throw new Error("Illegal Invocation");
  }

  (function (){
    var requiredValue = {};
    var value;
    var counter = 0;

    function getCorrectValueObject(requiredParameter){
      function nestedFunction(){
        var requiredCounterValue = 1;
        if(requiredParameter === requiredValue) {
          if(counter === requiredCounterValue) {
            return {value: "Correct Value"};
          }
        }

        return {value: "Incorrect Value"};
      }

      return nestedFunction();
    }

    function setValue(){
      // Test update-expression
      counter++;
      
      // Test call-expression
      assertLegalInvocation();

      function nestedSetValue(){
        // Test destructuring
        ({value} = getCorrectValueObject(requiredValue));
      }

      nestedSetValue()
    }

    function myFunction(myParameter1, myParameter2, myParameter3){
      setValue();

      myParameter1 = TEST_OUTPUT = value;
    }

    myFunction();
  })();
  `,
    { target: "node", flatten: true }
  );

  expect(output).toContain("_flat_getCorrectValue");
  expect(output).toContain("_flat_setValue");
  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #17: Don't apply to generator functions", async () => {
  var output = await JsConfuser(
    `
  function* myGeneratorFunction(){
    yield "Correct Value";
  }

  TEST_OUTPUT = (myGeneratorFunction()).next().value;
  `,
    { target: "node", flatten: true }
  );

  expect(output).not.toContain("_flat_myGeneratorFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #18: Redefined variable in nested scope", async () => {
  var output = await JsConfuser(
    `
  (function (){
    var outsideVar = "Incorrect Value 1";
    function myFunction1(){
      (()=>{
        var outsideVar = "Correct Value 1";
        TEST_OUTPUT_1 = outsideVar;
      })();
    };
  
    myFunction1();
  
    outsideVar = "Correct Value 2";
  
    function myFunction2(){
      (()=>{
        var outsideVar = "Incorrect Value 2";
      })();
      TEST_OUTPUT_2 = outsideVar;
    };
  
    myFunction2();
  })();
  `,
    {
      target: "node",
      flatten: true,
      renameVariables: (x) => !x.includes("_flat_"),
    }
  );

  expect(output).toContain("_flat_myFunction1");
  expect(output).toContain("_flat_myFunction2");

  var TEST_OUTPUT_1, TEST_OUTPUT_2;
  eval(output);

  expect(TEST_OUTPUT_1).toStrictEqual("Correct Value 1");
  expect(TEST_OUTPUT_2).toStrictEqual("Correct Value 2");
});

test("Variant #19: Nested function declaration", async () => {
  var output = await JsConfuser(
    `
  function myFunction(){
    TEST_OUTPUT = nestedFunctionDeclaration();

    function nestedFunctionDeclaration(){
      return "Correct Value";
    }
  }

  myFunction();
  `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #20: Don't apply to functions that use 'this' 'arguments' or 'eval'", async () => {
  var output = await JsConfuser(
    `
  function myFunction(){
    usesEval();
  }

  function usesThis(){
    return this;
  }
  function usesArguments(){
    return arguments;
  }
  function usesEval(){
    eval("TEST_OUTPUT = 'Correct Value'");
  }

  myFunction();
  `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_myFunction");
  expect(output).not.toContain("_flat_usesThis");
  expect(output).not.toContain("_flat_usesArguments");
  expect(output).not.toContain("_flat_usesEval");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #21: Preserve function.length property", async () => {
  var output = await JsConfuser(
    `
  function oneParameter(a){};
  var twoParameters = function({a},{b,c},...d){};
  function threeParameters(a,b,c,d = 1,{e},...f){};

  TEST_OUTPUT = oneParameter.length + twoParameters.length + threeParameters.length;
  `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).toContain("_flat_oneParameter");
  expect(output).not.toContain("_flat_twoParameters");
  expect(output).not.toContain("_flat_threeParameters");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(6);
});

test("Variant #22: Modify object properties", async () => {
  var output = await JsConfuser(
    `
    var myObject = {};

    function setProperty(property, value){
      myObject[property] = value;
    }

    function getProperty(property){
      return myObject[property];
    }

    setProperty("TEST_PROPERTY", "Correct Value");
    TEST_OUTPUT = getProperty("TEST_PROPERTY");
  `,
    { target: "node", flatten: true }
  );

  expect(output).toContain("_flat_setProperty");
  expect(output).toContain("_flat_getProperty");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #23: Reference original function name", async () => {
  var output = await JsConfuser(
    `
    (function (){
      function myFunction(){
        var valueToCheck = myFunction;
        TEST_OUTPUT = typeof valueToCheck === "function";
      }

      myFunction();
    })();
  `,
    { target: "node", flatten: true }
  );

  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #24: Typeof expression", async () => {
  var output = await JsConfuser(
    `
    function myFunction(){
      TEST_OUTPUT = typeof nonExistentVariable === "undefined";
    }

    myFunction();
  `,
    { target: "node", flatten: true }
  );

  expect(output).toContain("_flat_myFunction");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual(true);
});
