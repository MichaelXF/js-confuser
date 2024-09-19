import JsConfuser from "../../../src/index";
import { ObfuscateOptions } from "../../../src/options";

// Used for tests #15 and #21
const customIdentifierGenerator = () =>
  "_" + Math.random().toString(36).substr(2, 9);

test("Variant #1: Rename variables properly", async () => {
  var code = "var TEST_VARIABLE = 1;";
  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output.split("var ")[1].split("=")[0]).not.toEqual("TEST_VARIABLE");
  expect(output).not.toContain("TEST_VARIABLE");
});

test("Variant #2: Don't rename global accessors", async () => {
  var code = `
  var TEST_VARIABLE = 1;
  success(TEST_VARIABLE); // success should not be renamed
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).toContain("success");
  expect(output).not.toContain("TEST_VARIABLE");

  var passed = false;
  function success() {
    passed = true;
  }
  eval(output);

  expect(passed).toStrictEqual(true);
});

test("Variant #3: Rename shadowed variables properly", async () => {
  var code = `
  var TEST_VARIABLE = 1;
  
  function run(){
    var TEST_VARIABLE = 10;
    input(TEST_VARIABLE);
  }

  run();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(10);
});

test("Variant #4: Don't rename member properties", async () => {
  var code = `

    var TEST_OBJECT = { TEST_PROPERTY: 100 }

    input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).toContain("TEST_PROPERTY");

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

test("Variant #5: Handle variable defined with let (1)", async () => {
  var code = `

    // lexically bound
    let TEST_OBJECT = { TEST_PROPERTY: 100 }

    input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

test("Variant #6: Handle variable defined with let (2)", async () => {
  var code = `

    // lexically bound
    let TEST_OBJECT = { TEST_PROPERTY: "UPPER_VALUE" }
    if ( true ) {
      let TEST_OBJECT = { TEST_PROPERTY: 100 }
      input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
    }

  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

test("Variant #7: Handle variable defined with let (3)", async () => {
  var code = `

    // lexically bound
    let TEST_OBJECT = { TEST_PROPERTY: "UPPER_VALUE" }
    if ( true ) {
      let TEST_OBJECT = { TEST_PROPERTY: 100 }
      input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
    }

  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).not.toContain("TEST_OBJECT");
  expect(output).toContain("TEST_PROPERTY");
  expect(output).toContain("input");
  expect(output).toContain("let a");
  expect(typeof output.split("let a")[1]).toStrictEqual("string");

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

test("Variant #8: Don't rename undefined (reservedIdentifiers)", async () => {
  var code = `
    input(undefined)
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
  });

  expect(output).toContain("undefined");

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(undefined);
});

test("Variant #9: Don't rename exported names", async () => {
  var code = `
    export function abc(){

    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
  });

  expect(output).toContain("abc");
});

test("Variant #10: Call renameVariables callback properly (variables)", async () => {
  var code = `
    var myVariable = 1;
  `;

  var input: [string, boolean] | null = null;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameGlobals: true,
    renameVariables: (name, isTopLevel) => {
      input = [name, isTopLevel];
      return false;
    },
  });

  // Ensure custom implementation was called
  expect(input).toEqual(["myVariable", true]);

  // Ensure myVariable was not renamed
  expect(output).toContain("myVariable");
});

test("Variant #11: Call renameVariables callback properly (variables, nested)", async () => {
  var code = `
    (function(){
      var myVariable = 1;
    })();
  `;

  var input: [string, boolean] | null = null;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameGlobals: true,
    renameVariables: (name, isTopLevel) => {
      input = [name, isTopLevel];

      return true;
    },
  });

  // Ensure custom implementation was called
  expect(input).toEqual(["myVariable", false]);

  // Ensure myVariable was renamed
  expect(output).not.toContain("myVariable");
});

test("Variant #12: Call renameVariables callback properly (function declaration)", async () => {
  var code = `
    function myFunction(){

    }
  `;

  var input: [string, boolean] | null = null;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameGlobals: true,
    renameVariables: (name, isTopLevel) => {
      input = [name, isTopLevel];

      return true;
    },
  });

  // Ensure custom implementation was called
  expect(input).toEqual(["myFunction", true]);

  // Ensure myFunction was renamed
  expect(output).not.toContain("myFunction");
});

test("Variant #13: Allow excluding custom variables from being renamed", async () => {
  var code = `
    var myVariable1 = 1;
    var myVariable2 = 1;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameVariables: (name, isTopLevel) => {
      return name !== "myVariable1";
    },
    renameGlobals: true,
  });

  expect(output).toContain("myVariable1");
  expect(output).not.toContain("myVariable2");
});

test("Variant #14: should not break global variable references", async () => {
  /**
   * In this case `b` is a global variable,
   *
   * "mangled" names are a,b,c,d...
   *
   * therefore make sure `b` is NOT used as it breaks program
   */
  var code = `
  var a = "";

  function myFunction(param1, param2){
      b(param1);
  }

  myFunction("Hello World");
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).not.toContain("b(b)");

  var value;
  function b(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual("Hello World");
});

test.each<ObfuscateOptions["identifierGenerator"]>([
  "randomized",
  "mangled",
  customIdentifierGenerator,
])(
  "Variant #15: Function parameter default value",
  async (identifierGeneratorMode) => {
    /**
     * In this case `b` is a global variable,
     *
     * "mangled" names are a,b,c,d...
     *
     * therefore make sure `b` is NOT used as it breaks program
     */
    var code = `
   var a = "Filler Variables";
   var b = "Hello World";
   var c = "Another incorrect string";
 
   function myFunction(param1 = ()=>{
     return b;
   }){
    var b = param1();
    if(false){
      a,c;
    }
    input(b);
   }
 
   myFunction();
   `;

    var { code: output } = await JsConfuser.obfuscate(code, {
      target: "node",
      renameVariables: true,
      renameGlobals: true,
      identifierGenerator: identifierGeneratorMode,
    });

    var value;
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);

    expect(value).toStrictEqual("Hello World");
  }
);

// https://github.com/MichaelXF/js-confuser/issues/24
test("Variant #16: Function with multiple parameters and a default value", async () => {
  var code = `
  function FuncA(param1, param2 = FuncB){
    param2()
  }
  
  function FuncB(){
    input("Success!");
  }
  
  FuncA();
   `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual("Success!");
});

// https://github.com/MichaelXF/js-confuser/issues/60
test("Variant #17: Function parameter and lexical variable clash", async () => {
  var code = `
  function fun1(a) {
    let b;
  }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
  });

  eval(output);
});

test("Variant #18: Catch parameter and lexical variable clash", async () => {
  var code = `
  try {

  } catch (a){
    let b;
  } 
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
  });

  eval(output);
});

// https://github.com/MichaelXF/js-confuser/issues/69
test("Variant #19: Don't break Import Declarations", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  import { createHash } from 'node:crypto'

  function sha256(content) {  
    return createHash('sha256').update(content).digest('hex')
  }

  TEST_OUTPUT = sha256("Hash this string");
  `,
    {
      target: "node",
      renameVariables: true,
    }
  );

  // Ensure the createHash got renamed
  expect(output).toContain("createHash as ");

  // Convert to runnable code
  // This smartly changes the `import` statement to a require call, keeping the new variable name intact
  var newVarName = output.split("createHash as ")[1].split("}")[0];
  output = output
    .split(";")
    .filter((s) => !s.startsWith("import"))
    .join(";");
  output = `var {createHash: ${newVarName}}=require('crypto');` + output;

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(
    "1cac63f39fd68d8c531f27b807610fb3d50f0fc3f186995767fb6316e7200a3e"
  );
});

// https://github.com/MichaelXF/js-confuser/issues/80
test("Variant #20: Don't break code with var and let variables in same scope", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function log(param) {
    let message = param;
    var isWarning = false;
    var isError = false;
  
    TEST_OUTPUT = message;
  };

  log("Correct Value");
  `,
    {
      target: "node",
      renameVariables: true,
    }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test.each<ObfuscateOptions["identifierGenerator"]>([
  "hexadecimal",
  "mangled",
  "number",
  "zeroWidth",
  customIdentifierGenerator,
])(
  "Variant #21: Work with custom identifierGenerator mode",
  async (identifierGeneratorMode) => {
    var { code: output } = await JsConfuser.obfuscate(
      `
  var myVar1 = "Correct Value";

  function myFunction(myVar2){
      myVar2 = myVar1;
      let myVar3 = myVar2;
      var myVar4 = myVar3;
      return myVar4;
  }

  TEST_OUTPUT = myFunction();
  `,
      {
        target: "node",
        renameVariables: true,
        identifierGenerator: identifierGeneratorMode,
      }
    );

    // Ensure 'myVar1' got renamed
    expect(output).not.toContain("myVar1");

    var TEST_OUTPUT;

    eval(output);
    expect(TEST_OUTPUT).toStrictEqual("Correct Value");
  }
);

test("Variant #22: Don't rename variables prefixed with '__NO_JS_CONFUSER_RENAME__'", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    var myValue = "Correct Value";

    var __NO_JS_CONFUSER_RENAME__myVar4 = "Incorrect Value";

    __NO_JS_CONFUSER_RENAME__myVar4 = myValue;

    eval( "TEST_OUTPUT = __NO_JS_CONFUSER_RENAME__myVar4" );
    `,
    {
      target: "node",
      renameVariables: true,
    }
  );

  // Ensure 'myValue' got renamed
  expect(output).not.toContain("myValue");
  // Ensure '__NO_JS_CONFUSER_RENAME__myVar4' was not renamed
  expect(output).toContain("__NO_JS_CONFUSER_RENAME__myVar4");

  // Test the code
  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #23: Re-use previously generated names", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function log(message){
    TEST_OUTPUT = message;
  }

  log("Correct Value");
  `,
    {
      target: "node",
      renameVariables: true,
      identifierGenerator: "mangled",
    }
  );

  expect(output).not.toContain("log");
  expect(output).toContain("function a(a)");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #24: Reference function name with parameter", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myFunction(myFunction){
    myFunction.property = "Correct Value";
  }

  myFunction(myFunction);
  TEST_OUTPUT = myFunction.property;
  `,
    { target: "node", renameVariables: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #25: Reference catch parameter", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  try {
    throw "Correct Value";
  } catch ( e ) {
    TEST_OUTPUT = e;
  }
  `,
    { target: "node", renameVariables: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #26: Transform __JS_CONFUSER_VAR__ to access variable mappings", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  var myVar1 = "Incorrect Value";

  function myFunction(){
    var myVar1 = "Correct Value";
    TEST_OUTPUT =  eval( __JS_CONFUSER_VAR__(myVar1) );
  }

  // Work on functions too
  eval( __JS_CONFUSER_VAR__(myFunction) + "()" ); // myFunction();
  `,
    { target: "node", renameVariables: true }
  );

  expect(output).not.toContain("myVar1");
  expect(output).not.toContain("__JS_CONFUSER_VAR__");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #27: Transform __JS_CONFUSER_VAR__ even when Rename Variables is disabled", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  var name = "John Doe";
  TEST_OUTPUT = __JS_CONFUSER_VAR__(name);
  `,
    { target: "node", renameVariables: false }
  );

  expect(output).not.toContain("__JS_CONFUSER_VAR__");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual("name");
});

test("Variant #28: Transform __JS_CONFUSER_VAR__ on High Preset", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    var a;
    var b;
    var c;
    function myFunction(){
      var a;
      var b;
      var c;

      return "Correct Value"
    }
    TEST_OUTPUT = eval(__JS_CONFUSER_VAR__(myFunction) + "()");
    `,
    {
      target: "node",
      preset: "high",
      pack: true,
    }
  );

  expect(output).not.toContain("__JS_CONFUSER_VAR__");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #29: Redefined hoisted function", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    "use strict";
    function a() {
      return 10;
    }

    TEST_OUTPUT = [];

    for (var i = 1; i <= a(); i++) {
      function a() {
        return 5;
      }
      var b, c;
      let d;
      TEST_OUTPUT.push(i);
    }
  `,
    { target: "node", renameVariables: true }
  );

  var TEST_OUTPUT;
  eval(code);

  // Non-strict mode: [1,2,3,4,5]
  // Strict mode: [1,2,3,4,5,6,7,8,9,10]
  expect(TEST_OUTPUT).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #30: Non-strict mode hoisted function", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function getTen() {
      return 10;
    }

    var counter = 0;

    for (var i = 1; i <= getTen(); i++) {
      function getFive() {
        return 5;
      }

      counter++;
    }

    TEST_FUNCTION(counter);
    `,
    { target: "node", renameVariables: true }
  );

  var TEST_FUNCTION = (value) => (TEST_OUTPUT = value);
  var TEST_OUTPUT;

  new Function("TEST_FUNCTION", code)(TEST_FUNCTION);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #31: Mangled identifier", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var outsideValue = "Correct Value";

    function functionWithParameter(a) {
      TEST_OUTPUT = outsideValue;
    }

    functionWithParameter("Incorrect Value"); // Correct Value
    `,
    { target: "node", renameVariables: true, identifierGenerator: "mangled" }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});
