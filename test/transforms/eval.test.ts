import JsConfuser from "../../src/index";

it("should put functions into eval statements", async () => {
  var code = `
    function TEST_FUNCTION(){

    }
  `;

  var output = await JsConfuser(code, { target: "browser", eval: true });

  expect(output).toContain("eval(");
});
