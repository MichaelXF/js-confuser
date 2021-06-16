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

it("should convert eligible functions to arrow functions", async () => {
  var code = `
  function FN(){
    return 1;
  }
  input( FN() )
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).toContain("=>");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual(1);
});

it("should not convert lower functions to arrow functions", async () => {
  var code = `
  input( FN() )
  function FN(){
    return 1;
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("=>");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual(1);
});

it("should work when shortening nested if-statements", async () => {
  var code = `
  var a = false;
  var b = true;
  if( a ) {
    if ( b ) {

    }
  } else {
    input(10)
  }
  `;

  var output = await JsConfuser(code, { target: "browser", minify: true });

  expect(output).not.toContain("=>");

  var value = "never_called",
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual(10);
});
