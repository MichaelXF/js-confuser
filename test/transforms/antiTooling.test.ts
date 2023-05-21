import JsConfuser from "../../src/index";

// https://github.com/MichaelXF/js-confuser/issues/74
test("Variant #1: Don't break Symbols", async () => {
  if (typeof Symbol !== "undefined") {
    for (var i = 0; i < 6; i++) {
      var output = await JsConfuser(
        `
  
      var sym1 = Symbol();
    
      if (true) {
        sym1;
        sym1;
        sym1;
      }
  
      TEST_OUTPUT = sym1;
    
      `,
        { target: "node", renameVariables: true }
      );

      var TEST_OUTPUT;

      eval(output);
      expect(typeof TEST_OUTPUT).toStrictEqual("symbol");
    }
  }
});
