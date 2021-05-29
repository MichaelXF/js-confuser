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

it("should work with dispatcher", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function container(x){
      function nested(x){
        return x * 10;
      }

      return nested(x);
    }

    input(container(10))
    `,
    {
      target: "node",
      flatten: true,
      dispatcher: true,
    }
  );

  var value = "never_called";
  function input(x) {
    value = x;
  }

  eval(output);
  expect(value).toStrictEqual(100);
});
