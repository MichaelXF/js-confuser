import JsConfuser from "../../src/index";

it("should contain `new Function` in the output and work", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function add(a,b){
      return a + b;
    }
    
    input(add(10, 5))
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");
  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(15);
});

it("should work with multiple functions", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function add(a,b){
      return a + b;
    }

    function parse(str){
      return parseInt(str);
    }
    
    input(add(parse("20"), 5))
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");
  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(25);
});
