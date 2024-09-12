import JsConfuser from "../../src/index";

test("Variant #1: Middleman function calls", async () => {
  var code = `
  
    function TEST_FUNCTION(arg){
      input(10);
    }

    TEST_FUNCTION(10);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });

  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #2: Don't middleman functions relying on arguments identifier", async () => {
  var code = `
  
  function TEST_FUNCTION(){
    var arg = arguments[0];
  }

  TEST_FUNCTION(10);
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });

  expect(output).toContain("function TEST_FUNCTION(");
});

test("Variant #3: Don't middleman functions relying on this identifier", async () => {
  var code = `
  
  function TEST_FUNCTION(){
    this.key = 1;
  }

  TEST_FUNCTION(10);
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });

  expect(output).toContain("function TEST_FUNCTION(");
});

test("Variant #4: Work with nested functions", async () => {
  var code = `
  
  function TEST_FUNCTION(){
    function TEST_NESTED_FUNCTION(){
      input(10)
    }

    TEST_NESTED_FUNCTION()
  }

  TEST_FUNCTION();
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #5: Work with nested functions and parameters", async () => {
  var code = `
  
  function TEST_FUNCTION(x){
    function TEST_NESTED_FUNCTION(y){
      input(y)
    }

    TEST_NESTED_FUNCTION(x)
  }

  TEST_FUNCTION(10);
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #6: Work with nested functions and return values", async () => {
  var code = `
  
  function TEST_FUNCTION(){
    function TEST_NESTED_FUNCTION(){
      return 10;
    }

    return TEST_NESTED_FUNCTION()
  }

  input(TEST_FUNCTION());
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #7: Work with nested and sibling functions and return values", async () => {
  var code = `

  function TEST_FUNCTION_2(){
    function TEST_NESTED_FUNCTION(){
      return 10;
    }

    return TEST_NESTED_FUNCTION()
  }
  
  function TEST_FUNCTION(){
    return TEST_FUNCTION_2();
  }

  input(TEST_FUNCTION());
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #8: Work with referencing the function itself", async () => {
  var code = `


  
  function TEST_FUNCTION(x){
    return x;
  }

  var fn = TEST_FUNCTION;

  input(fn(10));
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #9: Work with the spread operator on arguments", async () => {
  var code = `

  function TEST_FUNCTION(x, y, z){
    return x + y + z;
  }

  input(TEST_FUNCTION(...[2, 10, 8]));
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(20);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #10: Work with the spread operator on parameters", async () => {
  var code = `


  
  function TEST_FUNCTION(...a){
    return a[0] + a[1] + a[2];
  }

  input(TEST_FUNCTION(2, 10, 8));
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(20);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #11: Work with the spread operator on both arguments and parameters", async () => {
  var code = `

  
  function TEST_FUNCTION(...a){
    return a[0] + a[1] + a[2];
  }

  input(TEST_FUNCTION(...[2, 10, 8]));
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
  });
  function input(x) {
    expect(x).toStrictEqual(20);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

test("Variant #12: Work with Variable Masking", async () => {
  var code = `

  function TEST_FUNCTION_2(){
    function TEST_NESTED_FUNCTION(){
      return 10;
    }

    return TEST_NESTED_FUNCTION()
  }
  
  function TEST_FUNCTION(){
    var fn = TEST_FUNCTION_2;
    return fn();
  }

  input(TEST_FUNCTION());
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
    variableMasking: true,
  });

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);

  expect(value).toStrictEqual(10);
});

test("Variant #13: Work with Control Flow Flattening", async () => {
  var code = `

  function TEST_FUNCTION_2(){
    function TEST_NESTED_FUNCTION(){
      return 10;
    }

    return TEST_NESTED_FUNCTION()
  }
  
  function TEST_FUNCTION(){
    var fn = TEST_FUNCTION_2;
    return fn();
  }

  input(TEST_FUNCTION());
`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    dispatcher: true,
    controlFlowFlattening: true,
    pack: true,
  });

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);

  expect(value).toStrictEqual(10);
});

// https://github.com/MichaelXF/js-confuser/issues/26
test("Variant #14: Apply to every level of the code", async () => {
  var code = `
  function OUTER(){
    function INNER(){
      return 100;
    }

    return INNER();
  }

  input(OUTER());
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    dispatcher: true,
  });

  expect(output).not.toContain("OUTER");
  expect(output).not.toContain("INNER");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual(100);
});

// https://github.com/MichaelXF/js-confuser/issues/77
test("Variant #15: Work with code that uses toString() function", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myFunction(){
    
  }
  
  TEST_OUTPUT = toString();
  `,
    {
      target: "node",
      dispatcher: true,
    }
  );

  var toString = () => "Correct Value";
  var TEST_OUTPUT;

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #16: Don't change functions that use 'eval'", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myEvalFunction(){
    return eval("1+1");
  }

  TEST_OUTPUT = myEvalFunction();
  `,
    { target: "node", dispatcher: true }
  );

  expect(output).not.toContain("dispatcher");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(2);
});

// https://github.com/MichaelXF/js-confuser/issues/103
test("Variant #17: Don't break default parameter, function expression", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  var X = "Correct Value";

function printX(
  getX = function () {
    return X;
  }
) {
  var X = "Incorrect Value";

  TEST_OUTPUT = getX();
}

printX();
  `,
    { target: "node", dispatcher: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #18: Preserve function.length property", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myFunction1(){
    // Function.length = 0
  }
  function myFunction2(a, b, c, d = "") {
    // Function.length = 3
  }
  
  myFunction1();
  myFunction2();
  TEST_OUTPUT_1 = myFunction1.length;
  TEST_OUTPUT_2 = myFunction2.length;
  
  `,
    { target: "node", dispatcher: true }
  );

  expect(output).toContain("dispatcher_0");

  var TEST_OUTPUT_1, TEST_OUTPUT_2;
  eval(output);

  expect(TEST_OUTPUT_1).toStrictEqual(0);
  expect(TEST_OUTPUT_2).toStrictEqual(3);
});

test("Variant #19: Lexically bound variables", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  switch (true) {
    case true:
      let message = "Hello World";
  
      function logMessage() {
        TEST_OUTPUT = message;
      }
  
      logMessage();
  }
  `,
    {
      target: "node",
      dispatcher: true,
    }
  );

  var TEST_OUTPUT;

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});
