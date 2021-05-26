import JsConfuser from "../../src/index";

it("should middleman function calls", async () => {
  var code = `
  
    function TEST_FUNCTION(arg){
      input(10);
    }

    TEST_FUNCTION(10);
  `;

  var output = await JsConfuser(code, { target: "browser", dispatcher: true });

  function input(x) {
    expect(x).toStrictEqual(10);
  }

  expect(output).not.toContain("function TEST_FUNCTION(");
  eval(output);
});

it("should not middleman functions relying on arguments identifier", async () => {
  var code = `
  
  function TEST_FUNCTION(){
    var arg = arguments[0];
  }

  TEST_FUNCTION(10);
`;

  var output = await JsConfuser(code, { target: "browser", dispatcher: true });

  expect(output).toContain("function TEST_FUNCTION(");
});

it("should not middleman functions relying on this identifier", async () => {
  var code = `
  
  function TEST_FUNCTION(){
    this.key = 1;
  }

  TEST_FUNCTION(10);
`;

  var output = await JsConfuser(code, { target: "browser", dispatcher: true });

  expect(output).toContain("function TEST_FUNCTION(");
});
