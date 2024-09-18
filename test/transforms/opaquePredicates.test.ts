import JsConfuser from "../../src/index";

test("Variant #1: Obfuscate IF-statements", async () => {
  var code = `

    var test = false;
    if ( test ) {

    } else {
      TEST_OUTPUT = "Correct Value";
    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    opaquePredicates: true,
  });

  expect(output).not.toContain("(test)");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

// https://github.com/MichaelXF/js-confuser/issues/45
test("Variant #2: Obfuscate Switch statements with default case", async () => {
  var code = `
    switch (0) {
      case 1:
        TEST_OUTPUT = "Incorrect Value";
        break;
      default:
        TEST_OUTPUT = "Correct Value";
        break;
     }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    opaquePredicates: true,
  });

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #3: Obfuscate Return statements", async () => {
  var code = `
    function testFunction() {
      if(false) return;
    
      return "Correct Value";
    }

    TEST_OUTPUT = testFunction();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    opaquePredicates: true,
  });

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #4: Obfuscate Conditional expressions", async () => {
  var code = `
    var test = true;
    TEST_OUTPUT = test ? "Correct Value" : "Incorrect Value";
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    opaquePredicates: true,
  });

  expect(output).not.toContain("=test?");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});
