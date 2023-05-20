import JsConfuser from "../../src/index";

it("should bring independent to the global level", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function container(){
      function nested(param){

      }

      nested();
    }
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  // Ensure flatten was applied
  expect(output).toContain("[param]");
});

it("should have correct return values", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(){
      return 10;
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

it("should have correct parameters", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(x, y){
      input(x + y);
    }

    TEST_FUNCTION(10, 15);
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(25);
});

it("should have correct parameters when nested", async () => {
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

it("should have correct return values when nested", async () => {
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

it("should have correct values when deeply nested", async () => {
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

it("should have correct values when modifying local variables", async () => {
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

it("should work with dispatcher", async () => {
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

it("should not change functions with const", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function TEST_FUNCTION(x, y){
      const CONSTANT = 20;

      return CONSTANT + x + y;
    }

    input(TEST_FUNCTION(10, 5));
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output).not.toContain("set");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(35);
});

// https://github.com/MichaelXF/js-confuser/issues/25
it("should work when pattern-based assignment expressions are involved", async () => {
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
  expect(output).toContain("[i],[]");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);
  expect(value).toStrictEqual(1);
});

it("should work on async functions", async () => {
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

it("should work on Function Expressions", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var outsideVar = "Correct Value";

    var myFunctionExpression = function(){
      return outsideVar;
    }

    TEST_OUTPUT = myFunctionExpression();
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  // Ensure flatten applied
  expect(output).toContain("_flat_myFunctionExpression");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

it("should work on Properties", async () => {
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
  expect(output).toContain("_flat_myInitProperty");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

it("should work with RGF enabled", async () => {
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
