import JsConfuser from "../../../src/index";

it("should conceal strings", async () => {
  var code = `var TEST_STRING = "Hello World"`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).not.toContain("Hello World");
});

it("should decode strings properly", async () => {
  var code = `
   var TEST_STRING = "Hello World"

   input(TEST_STRING);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).not.toContain("Hello World");

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual("Hello World");
});

it("should decode multiple strings properly", async () => {
  var code = `
    TEST_STRING_1 = "Hello World"
    TEST_STRING_2 = "Hello World"
    TEST_STRING_3 = "Another String"
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).not.toContain("Hello World");
  expect(output).not.toContain("Another String");

  var TEST_STRING_1, TEST_STRING_2, TEST_STRING_3;

  eval(output);

  expect(TEST_STRING_1).toStrictEqual("Hello World");
  expect(TEST_STRING_2).toStrictEqual("Hello World");
  expect(TEST_STRING_3).toStrictEqual("Another String");
});

it("should not encode import expressions", async () => {
  var code = `
   import("my-module").then(module=>{
     // ...
   })
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("my-module");
});

it("should not encode import statements", async () => {
  var code = `
   import x from "my-module"
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("my-module");
});

it("should not encode require imports", async () => {
  var code = `
   require("my-module")
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("my-module");
});

it("should not encode directives ('use strict')", async () => {
  var code = `
  'use strict'
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("use strict");
});

it("should work on property keys", async () => {
  var code = `
  var myObject = {
    myKey: 100
  }

  TEST_VAR = myObject.myKey;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    stringConcealing: true,
  });

  expect(output).not.toContain("myKey");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

it("should work on class keys", async () => {
  var code = `
  class MyClass {
    myMethod(){
      return 100;
    }
  }

  var myObject = new MyClass();

  TEST_VAR = myObject.myMethod();
  `;

  var output = await JsConfuser(code, {
    target: "node",
    stringConcealing: true,
  });

  expect(output).not.toContain("myMethod");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

it("should not encode constructor key", async () => {
  var code = `
  class MyClass {
    constructor(){
      TEST_VAR = 100;
    }
  }

  new MyClass();
  `;

  var output = await JsConfuser(code, {
    target: "node",
    stringConcealing: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

// https://github.com/MichaelXF/js-confuser/issues/82
it("should work inside the Class Constructor function", async () => {
  var code = `
  class MyClass1 {}
  class MyClass2 extends MyClass1 {
    constructor(){
      super();
      this["myString1"] = true;
      this["myString2"] = true;
      this["myString3"] = true;
    }
  }

  var instance = new MyClass2();

  TEST_OUTPUT = instance.myString1 === true; // true
  `;

  var output = await JsConfuser(code, {
    target: "node",
    stringConcealing: true,
  });

  // Ensure the strings got encrypted properly
  expect(output).not.toContain("myString");

  // Ensure the code works
  var TEST_OUTPUT = false;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

it("should be configurable by custom function option", async () => {
  var code = `
  var myVar1 = "My First String";
  var myVar2 = "My Second String";
  var myVar3 = "My Third String";

  TEST_RESULT = [myVar1, myVar2, myVar3];
  `;

  var strings = [];

  var output = await JsConfuser(code, {
    target: "node",
    stringConcealing: (str) => {
      strings.push(str);

      return str !== "My Second String";
    },
  });

  // Ensure stringConcealing found all the strings
  expect(strings).toContain("My First String");
  expect(strings).toContain("My Second String");
  expect(strings).toContain("My Third String");

  // These strings should be encoded
  expect(output).not.toContain("My First String");
  expect(output).not.toContain("My Third String");

  // This string should NOT be encoded
  expect(output).toContain("My Second String");

  // Ensure strings get properly decoded
  var TEST_RESULT;

  eval(output);
  expect(TEST_RESULT).toStrictEqual([
    "My First String",
    "My Second String",
    "My Third String",
  ]);
});

test("Variant #13: Work without TextEncoder or Buffer being defined", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT = [];
  TEST_OUTPUT.push("My First String");
  TEST_OUTPUT.push("My Second String");
  TEST_OUTPUT.push("My Third String");
  TEST_OUTPUT.push("My Fourth String");
  TEST_OUTPUT.push("My Fifth String");
  `,
    { target: "node", stringConcealing: true }
  );

  // Ensure the strings got changed
  expect(output).not.toContain("My First String");
  expect(output).not.toContain("My Second String");
  expect(output).not.toContain("My Third String");
  expect(output).not.toContain("My Fourth String");
  expect(output).not.toContain("My Fifth String");

  // Disable TextEncoder and Buffer
  var global = {};
  var window = {};
  var Buffer = undefined;
  var TextEncoder = undefined;

  // Test the code
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([
    "My First String",
    "My Second String",
    "My Third String",
    "My Fourth String",
    "My Fifth String",
  ]);
});
