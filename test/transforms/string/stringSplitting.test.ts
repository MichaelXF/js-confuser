import JsConfuser from "../../../src/index";

test("Variant #1: Split strings", async () => {
  var code = `var TEST_STRING = "the brown dog jumped over the lazy fox."`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringSplitting: true,
  });

  expect(output).not.toContain("the brown dog jumped over the lazy fox.");
});

test("Variant #2: Split strings and concatenate correctly", async () => {
  var code = `input("the brown dog jumped over the lazy fox.")`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringSplitting: true,
  });

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  expect(output).not.toContain("the brown dog jumped over the lazy fox.");

  eval(output);

  expect(value).toStrictEqual("the brown dog jumped over the lazy fox.");
});

test("Variant #3: Work on property keys", async () => {
  var code = `
  var myObject = {
    myVeryLongStringThatShouldGetSplit: 100
  }

  TEST_VAR = myObject.myVeryLongStringThatShouldGetSplit;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringSplitting: true,
  });

  expect(output).not.toContain("myVeryLongStringThatShouldGetSplit");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #4: Work on class keys", async () => {
  var code = `
  class MyClass {
    myVeryLongMethodName(){
      return 100;
    }
  }

  var myObject = new MyClass();

  TEST_VAR = myObject.myVeryLongMethodName();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringSplitting: true,
  });

  expect(output).not.toContain("myVeryLongMethodName");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #5: Don't encode constructor key", async () => {
  var code = `
  class MyClass {
    constructor(){
      TEST_VAR = 100;
    }
  }

  new MyClass();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringSplitting: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #6: Allow custom callback to exclude strings", async () => {
  var code = `
  var str1 = "-- Hello World --";
  var str2 = "-- This String Will Not Be Split --";
  var str3 = "-- This string Will Be Split --";
  `;

  var strings: string[] = [];
  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringSplitting: (str) => {
      strings.push(str);

      if (str == "-- This String Will Not Be Split --") {
        return false;
      }

      return true;
    },
  });

  expect(strings).toEqual([
    "-- Hello World --",
    "-- This String Will Not Be Split --",
    "-- This string Will Be Split --",
  ]);

  expect(output).toContain("-- This String Will Not Be Split --");

  expect(output).not.toContain("-- Hello World --");
  expect(output).not.toContain("-- This string Will Be Split --");
});
