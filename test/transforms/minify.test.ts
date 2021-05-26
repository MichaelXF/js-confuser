import JsConfuser from "../../src/index";

it("should group variable declarations together", async () => {
  var code = `
  var a = 0;
  var b = 1;
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).toContain("var a=0,b=1");
});

it("should remove block statements when not necessary", async () => {
  var code = `
  while(condition){
    doStuff();
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("{");
  expect(output).toContain("doStuff()");
});

it("should shorten guaranteed returns", async () => {
  var code = `
  function TEST_FUNCTION(){
    if ( condition ) {
      return 1;
    } else {
      return 0;
    }
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("if");
  expect(output).toContain("?");
});

it("should shorten guaranteed assignment expressions", async () => {
  var code = `
  function TEST_FUNCTION(){
    var value;
    if ( condition ) {
      value = 1;
    } else {
      value = 0;
    }
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("if");
  expect(output).toContain("value=");
  expect(output).toContain("?");
});

it("should reduce redundant assignment patterns", async () => {
  var code = `
  var [TEST_VARIABLE] = [1];
  `;
  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("[");
  expect(output).toContain("TEST_VARIABLE");
});
