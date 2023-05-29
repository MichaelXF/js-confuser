import JsConfuser from "../../../src/index";

it("should work", async () => {
  var output = await JsConfuser(`input("Hello World")`, {
    target: "node",
    stringCompression: true,
  });

  var value,
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual("Hello World");
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
    stringCompression: true,
  });

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
    stringCompression: true,
  });

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
    stringCompression: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

it("should be configurable by custom function option", async () => {
  var code = `
  TEST_OUTPUT_1 = "My String 1";
  TEST_OUTPUT_2 = "My String 2";
  TEST_OUTPUT_3 = "My String 3";
  `;

  var stringsFound = [];

  var output = await JsConfuser(code, {
    target: "node",
    stringCompression: (strValue) => {
      stringsFound.push(strValue);

      // Change all strings but "My String 2"
      return strValue !== "My String 2";
    },
  });

  // Ensure all strings were found
  expect(stringsFound).toContain("My String 1");
  expect(stringsFound).toContain("My String 2");
  expect(stringsFound).toContain("My String 3");

  // Ensure the strings got changed (except for "My String 2")
  expect(output).not.toContain("TEST_OUTPUT_1='My String 1'");
  expect(output).toContain("TEST_OUTPUT_2='My String 2'");
  expect(output).not.toContain("TEST_OUTPUT_3='My String 3'");

  // Make sure the code still works!
  var TEST_OUTPUT_1, TEST_OUTPUT_2, TEST_OUTPUT_3;

  eval(output);

  expect(TEST_OUTPUT_1).toStrictEqual("My String 1");
  expect(TEST_OUTPUT_2).toStrictEqual("My String 2");
  expect(TEST_OUTPUT_3).toStrictEqual("My String 3");
});
