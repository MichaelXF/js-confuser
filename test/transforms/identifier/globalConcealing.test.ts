import JsConfuser from "../../../src/index";

test("Variant #1: Hide global names (such as Math)", async () => {
  var code = `
  var TEST_RESULT = Math.floor(10.1);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    globalConcealing: true,
  });

  expect(output).not.toContain("Math.floor");
  expect(output).not.toContain("=Math");
  expect(output).toContain('["Math"]');
  expect(output).toContain("window");
});

test("Variant #2: Do not hide modified identifiers", async () => {
  var code = `
  var Math = 50;

  console.log(Math);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    globalConcealing: true,
  });

  expect(output).toContain('log"](Math)');
});

test("Variant #3: Properly hide in default parameter, function expression", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function myFunction( myParameter = function(){
    var myVariable = true;
    return myVariable;
  } ) {
    return myParameter();
  }

  TEST_OUTPUT = myFunction(); // true
  `,
    { target: "node", globalConcealing: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

// https://github.com/MichaelXF/js-confuser/issues/131
test("Variant #4: Don't change __dirname", async function () {
  var code = `
  TEST_OUTPUT = __dirname;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    globalConcealing: true,
  });

  expect(output).toContain("__dirname");

  var TEST_OUTPUT;
  eval(output);

  expect(typeof TEST_OUTPUT).toStrictEqual("string");
});

test("Variant #5: Hide 'global' var, even if properties are modified", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    TEST_GLOBAL_VARIANT_5_OUTPUT = global.TEST_GLOBAL_VARIANT_5_INPUT * 2;
    `,
    { target: "node", globalConcealing: true }
  );

  // Input should get transformed
  expect(output).not.toContain("global['TEST_GLOBAL_VARIANT_5_INPUT");

  // TEST_GLOBAL_VARIANT_5_OUTPUT should stay the same
  expect(output).not.toContain("global['TEST_GLOBAL_VARIANT_5_OUTPUT");

  (global as any).TEST_GLOBAL_VARIANT_5_INPUT = 50;
  (global as any).TEST_GLOBAL_VARIANT_5_OUTPUT = 100;

  eval(output);

  expect((global as any).TEST_GLOBAL_VARIANT_5_OUTPUT).toStrictEqual(100);
});

test("Variant #6: Preserve __JS_CONFUSER_VAR__", async () => {
  // Covers both defined and undefined case
  var { code: output } = await JsConfuser.obfuscate(
    `
    var TEST_VARIABLE
    TEST_OUTPUT = [__JS_CONFUSER_VAR__(TEST_OUTER_VARIABLE), __JS_CONFUSER_VAR__(TEST_VARIABLE)];
    `,
    {
      target: "node",
      globalConcealing: true,
    }
  );

  expect(output).not.toContain("__JS_CONFUSER_VAR__");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(["TEST_OUTER_VARIABLE", "TEST_VARIABLE"]);
});

test("Variant #7: Custom callback option", async () => {
  var namesCollected: string[] = [];

  var { code: output } = await JsConfuser.obfuscate(
    `
    expect(true).toStrictEqual(true);

    TEST_OUTPUT = true;
    `,
    {
      target: "node",
      globalConcealing: (name) => {
        namesCollected.push(name);
        return false;
      },
    }
  );

  expect(namesCollected).toContain("expect");
  expect(namesCollected).not.toContain("TEST_OUTPUT");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #8: Don't change globals when modified", async () => {
  var namesCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    TEST_OUTPUT = true;

    function myFunction(){
    }

    // Reference TEST_OUTPUT
    myFunction(TEST_OUTPUT)
    `,
    {
      target: "node",
      globalConcealing: (name) => {
        namesCollected.push(name);
        return true;
      },
    }
  );

  expect(namesCollected).not.toContain("TEST_OUTPUT");
  var TEST_OUTPUT;

  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #9: Don't change arguments", async () => {
  var namesCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    function addTwo(){
      return arguments[0] + arguments[1];
    }

    TEST_OUTPUT = addTwo(10, 20);
    `,
    {
      target: "node",
      globalConcealing: (name) => {
        namesCollected.push(name);
        return true;
      },
    }
  );

  expect(namesCollected).not.toContain("arguments");
  expect(code).toContain("arguments[0]");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(30);
});

test("Variant #10: Properly handle declared global variables", async () => {
  var namesCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    function console(){
      VALID_GLOBAL.TEST_PROPERTY = true;
      VALID_GLOBAL.ANOTHER_PROPERTY = true;
      INVALID_GLOBAL = true;
    }

    console();
    `,
    {
      target: "node",
      globalConcealing: (globalName) => {
        namesCollected.push(globalName);
        return true;
      },
    }
  );

  expect(namesCollected).toContain("VALID_GLOBAL");
  expect(namesCollected).not.toContain("INVALID_GLOBAL");
  expect(namesCollected).not.toContain("console");

  var VALID_GLOBAL = { TEST_PROPERTY: false },
    INVALID_GLOBAL;

  // Global Concealing directly accesses globals from the global object
  global.VALID_GLOBAL = VALID_GLOBAL;

  eval(code);

  expect(VALID_GLOBAL.TEST_PROPERTY).toStrictEqual(true);
  expect(INVALID_GLOBAL).toStrictEqual(true);
});

test("Variant #11: Shadowed global variable", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function testFunction(){
      var console = {
        log: () => {
          TEST_OUTPUT = "Correct Value";
        }
      };
      function innerFunction(){
        console.log("You should not see this.");
      }

      innerFunction()
    }

    testFunction();

    `,
    {
      target: "node",
      globalConcealing: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});
