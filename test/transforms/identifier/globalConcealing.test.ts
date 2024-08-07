import JsConfuser from "../../../src/index";

test("Variant #1: Hide global names (such as Math)", async () => {
  var code = `
  var TEST_RESULT = Math.floor(10.1);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    globalConcealing: true,
  });

  expect(output).not.toContain("Math.floor");
  expect(output).not.toContain("=Math");
  expect(output).toContain("['Math']");
  expect(output).toContain("window");
});

test("Variant #2: Do not hide modified identifiers", async () => {
  var code = `
  var Math = 50;

  console.log(Math);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    globalConcealing: true,
  });

  expect(output).toContain("log'](Math)");
});

test("Variant #3: Properly hide in default parameter, function expression", async () => {
  var output = await JsConfuser(
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

  var output = await JsConfuser(code, {
    target: "node",
    globalConcealing: true,
  });

  expect(output).toContain("__dirname");

  var TEST_OUTPUT;
  eval(output);

  expect(typeof TEST_OUTPUT).toStrictEqual("string");
});

test("Variant #5: Hide 'global' var, even if properties are modified", async () => {
  var output = await JsConfuser(
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

test("Variant #6: Detect Eval tamper (no tamper)", async () => {
  var code = `
  global.TEST_OUTPUT = global.TEST_GLOBAL;
  `;

  var output = await JsConfuser(code, {
    target: {
      name: "node",
      eval: true,
      strictMode: false,
    },
    globalConcealing: true,
  });

  var TEST_GLOBAL = {};
  (global as any).TEST_GLOBAL = TEST_GLOBAL;

  // 'new Function' runs in non-strict mode
  new Function(output)();

  // Make reuse global variable as 'new Function' runs in isolated environment
  var TEST_OUTPUT = (global as any).TEST_OUTPUT;

  expect(TEST_OUTPUT).toStrictEqual(TEST_GLOBAL);
});

test("Variant #7: Detect Eval tamper (tampered)", async () => {
  var code = `
  global.TEST_GLOBAL_VARIANT_7_OUTPUT = global.TEST_GLOBAL_VARIANT_7;
  `;

  var output = await JsConfuser(code, {
    target: {
      name: "node",
      eval: true,
      strictMode: false,
    },
    globalConcealing: true,
  });

  // Inject 'eval' tamper code
  output =
    `var _eval = eval;
  eval = (codeStr)=>( console.log(codeStr), _eval(codeStr) );
  ` + output;

  var TEST_GLOBAL_VARIANT_7 = {};
  (global as any).TEST_GLOBAL_VARIANT_7 = TEST_GLOBAL_VARIANT_7;
  var didError;

  try {
    // 'new Function' runs in non-strict mode
    new Function(output)();
  } catch (e) {
    didError = true;
  }

  expect(didError).toStrictEqual(true);

  // Ensure global variable was not affected
  var TEST_OUTPUT = (global as any).TEST_GLOBAL_VARIANT_7_OUTPUT;
  expect(TEST_OUTPUT).not.toStrictEqual(TEST_GLOBAL_VARIANT_7);
});
