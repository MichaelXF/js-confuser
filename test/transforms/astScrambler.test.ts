import JsConfuser from "../../src/index";

// https://github.com/MichaelXF/js-confuser/issues/74
test("Variant #1: Don't break Symbols", async () => {
  if (typeof Symbol !== "undefined") {
    for (var i = 0; i < 6; i++) {
      var { code: output } = await JsConfuser.obfuscate(
        `
  
      var sym1 = Symbol();
    
      if (true) {
        sym1;
        sym1;
        sym1;
      }
  
      TEST_OUTPUT = sym1;
    
      `,
        { target: "node", astScrambler: true, renameVariables: true }
      );

      var TEST_OUTPUT;

      eval(output);
      expect(typeof TEST_OUTPUT).toStrictEqual("symbol");
    }
  }
});

test("Variant #2: Join expressions into sequence expressions", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  TEST_OUTPUT = 0;
  TEST_OUTPUT++;
  TEST_OUTPUT++;
  TEST_OUTPUT++;
  if(TEST_OUTPUT > 0) {
    TEST_OUTPUT *= 2;
  }
  `,
    { target: "node", astScrambler: true, renameVariables: true }
  );

  expect(output).toContain("(TEST_OUTPUT=0,TEST_OUTPUT++");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(6);
});
