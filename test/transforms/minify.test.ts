import JsConfuser from "../../src/index";

it("should group variable declarations together", async () => {
  var code = `
  var a = 0;
  var b = 1;
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).toContain("var a=0,b=1");
});

it("should remove block statements when not necessary", async () => {
  var code = `
  while(condition){
    doStuff();
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("{");
  expect(output).toContain("doStuff()");
});

it("should shorten guaranteed returns", async () => {
  var code = `
  function TEST_FUNCTION(){
    if ( condition ) {
      return 1;
    } else {
      return 0;
    }
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("if");
  expect(output).toContain("?");
});

it("should shorten guaranteed assignment expressions", async () => {
  var code = `
  function TEST_FUNCTION(){
    var value;
    if ( condition ) {
      value = 1;
    } else {
      value = 0;
    }
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("if");
  expect(output).toContain("value=");
  expect(output).toContain("?");
});

it("should convert eligible functions to arrow functions", async () => {
  var code = `
  function FN(){
    return 1;
  }
  input( FN() )
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).toContain("=>");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual(1);
});

it("should not convert lower functions to arrow functions", async () => {
  var code = `
  input( FN() )
  function FN(){
    return 1;
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("=>");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual(1);
});

it("should work when shortening nested if-statements", async () => {
  var code = `
  var a = false;
  var b = true;
  if( a ) {
    if ( b ) {

    }
  } else {
    input(10)
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("=>");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual(10);
});

test("Variant #8: Shorten simple array destructuring", async () => {
  // Valid
  var output = await JsConfuser(`var [x] = [1]`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x=1");

  // Invalid
  var output2 = await JsConfuser(`var [x, y] = [1]`, {
    target: "node",
    minify: true,
  });

  expect(output2).toContain("var [x,y]");
});

test("Variant #9: Shorten simple object destructuring", async () => {
  // Valid
  var output = await JsConfuser(`var {x} = {x: 1}`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x=1");

  // Valid
  var output2 = await JsConfuser(`var {['x']: y} = {x: 1}`, {
    target: "node",
    minify: true,
  });

  expect(output2).toContain("var y=1");

  // Invalid
  var output3 = await JsConfuser(`var {x,y} = {x:1}`, {
    target: "node",
    minify: true,
  });

  expect(output3).toContain("var {x:x,y:y}");

  // Invalid
  var output4 = await JsConfuser(`var {y} = {x:1}`, {
    target: "node",
    minify: true,
  });

  expect(output4).toContain("var {y:y}");
});

test("Variant #10: Shorten booleans", async () => {
  // Valid
  var output = await JsConfuser(`var x = true;`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x=!0");

  // Valid
  var output2 = await JsConfuser(`var x = false`, {
    target: "node",
    minify: true,
  });

  expect(output2).toContain("var x=!1");
});

test("Variant #11: Shorten 'undefined' to 'void 0'", async () => {
  // Valid
  var output = await JsConfuser(`x = undefined;`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("x=void 0");

  // Valid
  var output2 = await JsConfuser(`var x = {undefined: 1}`, {
    target: "node",
    minify: true,
  });

  expect(output2).toContain("var x={[void 0]:1}");

  var output3 = await JsConfuser(
    `try { var undefined; (undefined) = true } catch(e) {}`,
    {
      target: "node",
      minify: true,
    }
  );

  eval(output3);
});

test("Variant #11: Shorten 'Infinity' to 1/0", async () => {
  // Valid
  var output = await JsConfuser(`var x = Infinity;`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x=1/0");

  // Valid
  var output2 = await JsConfuser(`var x = {Infinity: 1}`, {
    target: "node",
    minify: true,
  });

  expect(output2).toContain("var x={[1/0]:1}");
});

test("Variant #12: Shorten '!false' to 'true'", async () => {
  // Valid
  var output = await JsConfuser(`var x = !false;`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x=true");
});

test("Variant #13: Shorten 'false ? a : b' to 'b'", async () => {
  // Valid
  var output = await JsConfuser(`var x = false ? 10 : 15;`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x=15");
});

test("Variant #14: Shorten 'var x = undefined' to 'var x'", async () => {
  // Valid
  var output = await JsConfuser(`var x = undefined`, {
    target: "node",
    minify: true,
  });

  expect(output).toContain("var x");
  expect(output).not.toContain("var x=");
});

test("Variant #15: Removing implied 'return'", async () => {
  // Valid
  var output = await JsConfuser(
    `
  function MyFunction(){ 
    var output = "Hello World";
    console.log(output);
    this; // Stop arrow function conversion
    return;
  } 
  
  MyFunction();
  `,
    { target: "node", minify: true }
  );

  expect(output).not.toContain("return");

  // Invalid
  // https://github.com/MichaelXF/js-confuser/issues/34
  var output2 = await JsConfuser(
    `
  function greet(){ 
    if(true){ 
      console.log("return"); 
      return; 
    }

    var output = "should not show!"; console.log(output); 
  } 
  
  greet();
  `,
    { target: "browser", minify: true }
  );

  expect(output2).toContain("return");
});

// https://github.com/MichaelXF/js-confuser/issues/43
test("Variant #16: Handle deconstructuring in for loop", async () => {
  // Valid
  var output = await JsConfuser(
    `
    for(const [a] of [[1]]) {
        input(a);
    }
  `,
    { target: "node", minify: true }
  );

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual(1);
});

test("Variant #17: Remove unreachable code following a return statement", async () => {
  var output = await JsConfuser(
    `
    function myFunction(){
      return;
      unreachableStmt;
    }
  `,
    { target: "node", minify: true }
  );

  expect(output).not.toContain("unreachableStmt");
});

test("Variant #18: Remove unreachable code following a continue or break statement", async () => {
  var output = await JsConfuser(
    `
    for(var i =0; i < 10; i++){
      continue;
      unreachableStmt
    }

    while(true){
      break;
      unreachableStmt
    }
  `,
    { target: "node", minify: true }
  );

  expect(output).not.toContain("unreachableStmt");
});

test("Variant #19: Remove unreachable code following a throw statement", async () => {
  var output = await JsConfuser(
    `
    throw new Error("No more code to run");
    unreachableStmt;
  `,
    { target: "node", minify: true }
  );

  expect(output).not.toContain("unreachableStmt");
});

// https://github.com/MichaelXF/js-confuser/issues/76
test("Variant #20: Properly handle objects with `, ^, [, ] as keys", async () => {
  var output = await JsConfuser(
    `
  TEST_OBJECT = {
    "\`": true,
    "^": true,
    "]": true,
    "[": true
  };
  `,
    {
      target: "node",
      minify: true,
    }
  );

  var TEST_OBJECT;
  eval(output);

  expect(TEST_OBJECT).toStrictEqual({
    "`": true,
    "^": true,
    "]": true,
    "[": true,
  });
});

// https://github.com/MichaelXF/js-confuser/issues/75
test("Variant #21: Properly handle Object constructor (Function Declaration)", async () => {
  var output = await JsConfuser(
    `
  function MyClass() {};

  var myObject = new MyClass();

  TEST_OUTPUT = myObject instanceof MyClass;
  `,
    { target: "node", minify: true }
  );

  var TEST_OUTPUT = false;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #22: Properly handle Object constructor (Function Expression)", async () => {
  var output = await JsConfuser(
    `
  var MyClass = function() {};

  var myObject = new MyClass();

  TEST_OUTPUT = myObject instanceof MyClass;
  `,
    { target: "node", minify: true }
  );

  var TEST_OUTPUT = false;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #23: Shorten property names and method names", async () => {
  var output = await JsConfuser(
    `
  var myObject = { "myKey": "Correct Value" };
  var myClass = class { ["myMethod"](){ return "Correct Value" } }

  TEST_OUTPUT = myObject.myKey === (new myClass()).myMethod();
  `,
    { target: "node", minify: true }
  );

  expect(output).not.toContain("'myKey'");
  expect(output).not.toContain("'myMethod'");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #24: Variable grouping in switch case", async () => {
  var output = await JsConfuser(
    `
  switch(true){
    case true:
      var myVar1;
      var myVar2;
      var myVar3 = "Correct Value";
      var myVar4;

      TEST_OUTPUT = myVar3;
    break;
  }
  `,
    { target: "node", minify: true }
  );

  // Ensure the variable declarations were grouped
  expect(output).toContain("var myVar1,myVar2,myVar3");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #25: Don't break redefined function declaration", async () => {
  var output = await JsConfuser(
    `
  function a(){ TEST_OUTPUT = 1 };
  function a(){ TEST_OUTPUT = 2 };
  function a(){ TEST_OUTPUT = 3 };

  a();
  `,
    { target: "node", minify: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(3);
});

test("Variant #26: Don't break nested redefined function declaration", async () => {
  var output = await JsConfuser(
    `
  var a = 0;
  if(true){
    function a(){
      TEST_OUTPUT = 1;
    }
  }

  a();
  `,
    { target: "node", minify: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

// https://github.com/MichaelXF/js-confuser/issues/91
test("Variant #27: Preserve function.length property", async () => {
  var output = await JsConfuser(
    `
    function oneParameter(a){};
    var twoParameters = function({a},{b,c},...d){};
    function threeParameters(a,b,c,d = 1,{e},...f){};

    TEST_OUTPUT = oneParameter.length + twoParameters.length + threeParameters.length;
  `,
    { target: "node", minify: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(6);
});

// https://github.com/MichaelXF/js-confuser/issues/125
test("Variant #28: Don't break destructuring assignment", async () => {
  var output = await JsConfuser(
    `
    let objectSlice = [];
    objectSlice.push({
      a: 1,
      b: 2,
      c: 3,
    })
    for (let {
      a,
      b,
      c
    } of objectSlice) {
      TEST_OUTPUT = a + b + c;
    }
  `,
    { target: "node", minify: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(6);
});
