import JsConfuser from "../../../src/index";
import { ObfuscateOptions } from "../../../src/options";

test("Variant #1: Rename variables properly", async () => {
  var code = "var TEST_VARIABLE = 1;";
  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

test("Variant #8: Don't rename null (reservedIdentifiers)", async () => {
  var code = `
    input(null)
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(null);
});

test("Variant #9: Don't rename exported names", async () => {
  var code = `
    export function abc(){

    }
  `;

  var output = await JsConfuser(code, {
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

  var input = [];

  var output = await JsConfuser(code, {
    target: "browser",
    renameGlobals: true,
    renameVariables: (name, isTopLevel) => {
      input = [name, isTopLevel];
    },
  });

  expect(input).toEqual(["myVariable", true]);
});

test("Variant #11: Call renameVariables callback properly (variables, nested)", async () => {
  var code = `
    (function(){
      var myVariable = 1;
    })();
  `;

  var input = [];

  var output = await JsConfuser(code, {
    target: "browser",
    renameGlobals: true,
    renameVariables: (name, isTopLevel) => {
      input = [name, isTopLevel];
    },
  });

  expect(input).toEqual(["myVariable", false]);
});

test("Variant #12: Call renameVariables callback properly (function declaration)", async () => {
  var code = `
    function myFunction(){

    }
  `;

  var input = [];

  var output = await JsConfuser(code, {
    target: "browser",
    renameGlobals: true,
    renameVariables: (name, isTopLevel) => {
      input = [name, isTopLevel];
    },
  });

  expect(input).toEqual(["myFunction", true]);
});

test("Variant #13: Allow excluding custom variables from being renamed", async () => {
  var code = `
    var myVariable1 = 1;
    var myVariable2 = 1;
  `;

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

test("Variant #15: Function parameter default value", async () => {
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

  var output = await JsConfuser(code, {
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

  expect(value).toStrictEqual("Hello World");
});

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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
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

  var output = await JsConfuser(code, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
  });

  eval(output);
});

// https://github.com/MichaelXF/js-confuser/issues/69
test("Variant #19: Don't break Import Declarations", async () => {
  var output = await JsConfuser(
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
  var output = await JsConfuser(
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

test.each(["hexadecimal", "mangled", "number", "zeroWidth"])(
  "Variant #21: Work with custom identifierGenerator mode",
  async (identifierGeneratorMode) => {
    var output = await JsConfuser(
      `
  var myVar1 = "Correct Value";

  TEST_OUTPUT = myVar1;
  `,
      {
        target: "node",
        renameVariables: true,
        identifierGenerator:
          identifierGeneratorMode as ObfuscateOptions["identifierGenerator"],
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
  var output = await JsConfuser(
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
  var output = await JsConfuser(
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
  var output = await JsConfuser(
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
  var output = await JsConfuser(
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
