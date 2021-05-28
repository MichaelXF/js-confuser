import JsConfuser from "../../src/index";

it("should bring independent to the global level", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function container(){
      function nested(){

      }

      nested();
    }
    `,
    {
      target: "node",
      flatten: true,
    }
  );

  expect(output.startsWith("function nested_"));
});
