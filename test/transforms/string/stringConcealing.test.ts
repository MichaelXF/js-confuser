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
