import JsConfuser from "../../../src/index";

test("Variant #1: Conceal strings", async () => {
  var code = `TEST_STRING = "Hello World"`;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).not.toContain("Hello World");

  var TEST_STRING;

  eval(code);

  expect(TEST_STRING).toStrictEqual("Hello World");
});

test("Variant #2: Decode strings properly", async () => {
  var code = `
   var TEST_STRING = "Hello World"

   input(TEST_STRING);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
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

test("Variant #3: Decode multiple strings properly", async () => {
  var code = `
    TEST_STRING_1 = "Hello World"
    TEST_STRING_2 = "Hello World"
    TEST_STRING_3 = "Another String"
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
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

test("Variant #4: Don't encode import expressions", async () => {
  var code = `
   import("my-module").then(module=>{
     // ...
   })
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("my-module");
});

test("Variant #5: Don't encode import statements", async () => {
  var code = `
   import x from "my-module"
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("my-module");
});

test("Variant #6: Don't encode require imports", async () => {
  var code = `
   require("my-module")
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("my-module");
});

test("Variant #7: Don't encode directives ('use strict')", async () => {
  var code = `
  'use strict'
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    stringConcealing: true,
  });

  expect(output).toContain("use strict");
});

test("Variant #8: Work on property keys", async () => {
  var code = `
  var myObject = {
    myKey: 100
  }

  TEST_VAR = myObject.myKey;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringConcealing: true,
  });

  expect(output).not.toContain("myKey");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #9: Work on class keys", async () => {
  var code = `
  class MyClass {
    myMethod(){
      return 100;
    }
  }

  var myObject = new MyClass();

  TEST_VAR = myObject.myMethod();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringConcealing: true,
  });

  expect(output).not.toContain("myMethod");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #10: Don't encode constructor key", async () => {
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
    stringConcealing: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

// https://github.com/MichaelXF/js-confuser/issues/82
test("Variant #11: Work inside the Class Constructor function", async () => {
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

  var { code: output } = await JsConfuser.obfuscate(code, {
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

test("Variant #12: Configurable by custom function option", async () => {
  var code = `
  var myVar1 = "My First String";
  var myVar2 = "My Second String";
  var myVar3 = "My Third String";

  TEST_RESULT = [myVar1, myVar2, myVar3];
  `;

  var strings: string[] = [];

  var { code: output } = await JsConfuser.obfuscate(code, {
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
  var { code: output } = await JsConfuser.obfuscate(
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

test("Variant #14: Nested, duplicate strings", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var myVar = "Hello World";
    var myVar2 = "Another String";

    function main(){
      var object = {
        "Hello World": "Another String",
        "Another String"() {}
      }
      class MyClass {
        "Hello World"(){}
        "Another String" = () => {}
      }

      var myMainVar = "Hello World";
      var myMainVar2 = "Another String";

      function nested(){
        var myNestedVar = "Hello World";
        var myNestedVar2 = "Another String";

        TEST_OUTPUT = myNestedVar === "Hello World" && 
          myNestedVar2 === "Another String" && 
          (myNestedVar + myNestedVar2) == (myMainVar + myMainVar2) && 
          (myNestedVar + myNestedVar2) == (myVar + myVar2);
      }

      nested("Hello World")
    }

    main("Hello World")
    `,
    {
      target: "node",
      stringConcealing: true,
    }
  );

  expect(code).not.toContain("Hello World");
  expect(code).not.toContain("Another String");

  var TEST_OUTPUT;

  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #15: Template strings", async () => {
  var stringsCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    TEST_OUTPUT = \`Hello World\`
    `,
    {
      target: "node",
      stringConcealing: (strValue) => {
        stringsCollected.push(strValue);

        return true;
      },
    }
  );

  // Ensure the string got concealed
  expect(code).not.toContain("Hello World");

  // Ensure the custom implementation was called
  expect(stringsCollected).toContain("Hello World");

  // Ensure the code works
  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});
