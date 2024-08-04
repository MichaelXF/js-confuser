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
