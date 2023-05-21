import JsConfuser from "../../src/index";

it("should put functions into eval statements", async () => {
  var code = `
    function TEST_FUNCTION(){
    }
  `;

  var output = await JsConfuser(code, { target: "node", eval: true });

  expect(output).toContain("eval(");
});

it("should put functions into eval statements and have same result", async () => {
  var code = `
    function TEST_FUNCTION(){
      input(100)
    }
    TEST_FUNCTION();
  `;

  var output = await JsConfuser(code, { target: "node", eval: true });

  expect(output).toContain("eval(");

  var value = "never_called",
    input = (valueIn) => (value = valueIn);
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should move function declarations to the top of the block", async () => {
  var code = `
    TEST_FUNCTION();
    function TEST_FUNCTION(){
      input(100)
    }
  `;

  var output = await JsConfuser(code, { target: "node", eval: true });

  expect(output).toContain("eval(");

  var value = "never_called",
    input = (valueIn) => (value = valueIn);
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should work with Integrity also enabled", async () => {
  var code = `
    input("Hello World")
  `;

  var output = await JsConfuser(code, {
    target: "node",
    compact: false,
    eval: true,
    lock: {
      integrity: true,
    },
  });

  expect(output).toContain("eval(");

  var value = "never_called",
    input = (valueIn) => (value = valueIn);

  try {
    eval(output);
  } catch (e) {
    expect(e).toStrictEqual(undefined);
  }

  expect(value).toStrictEqual("Hello World");
});

it("should work on async functions", async () => {
  var output = await JsConfuser(
    `
  async function myFunction(){
    return "Correct Value";
  }

  (async ()=>{
    TEST_FUNCTION( await myFunction() );
  })();
  `,
    { target: "node", eval: true }
  );

  expect(output).toContain("eval");

  var wasCalled = false;

  function TEST_FUNCTION(value) {
    wasCalled = true;
    expect(value).toStrictEqual("Correct Value");
  }

  eval(output);

  setTimeout(() => {
    expect(wasCalled).toStrictEqual(true);
  }, 1000);
});

it("should work on generator functions", async () => {
  var output = await JsConfuser(
    `
  function* myFunction(){
    yield "Correct Value";
  }
  
  const gen = myFunction();

  TEST_OUTPUT = gen.next().value;
  `,
    { target: "node", eval: true }
  );

  expect(output).toContain("eval");

  var TEST_OUTPUT;

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});
