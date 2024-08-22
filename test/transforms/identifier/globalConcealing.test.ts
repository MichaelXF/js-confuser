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

test("Variant #6: Preserve __JS_CONFUSER_VAR__", async () => {
  // Covers both defined and undefined case
  var output = await JsConfuser(
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

  var output = await JsConfuser(
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
