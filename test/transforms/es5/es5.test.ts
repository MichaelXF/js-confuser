import JsConfuser from "../../../src/index";

it("should convert arrow functions to function expressions", async () => {
  var code = `var arrow = ()=>"Hello World"`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  expect(output).not.toContain("()=>");
});

it("should convert arrow functions and work", async () => {
  var code = `arrow = ()=>"Hello World"`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  // Ensure arrow function is gone
  expect(output).not.toContain("()=>");

  expect(output).toContain("function");

  var arrow;

  eval(output);

  expect(typeof arrow).toStrictEqual("function");
  expect(arrow()).toStrictEqual("Hello World");
});

it("should fix destructuring in assignment expressions", async () => {
  var code = `[TEST_VARIABLE] = [100];`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(100);
});

it("should fix destructuring in a sequence of assignment expressions", async () => {
  var code = `([TEST_VARIABLE] = [100], [TEST_VARIABLE_2] = [50]);`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;
  var TEST_VARIABLE_2;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(100);
  expect(TEST_VARIABLE_2).toStrictEqual(50);
});

it("should fix destructuring with empty elements", async () => {
  var code = `[, TEST_VARIABLE] = [100, 10];`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(10);
});

it("should fix destructuring in parameters", async () => {
  var code = `
  
  TEST_FUNCTION = function({key}){
    TEST_VARIABLE = key;
  }
  
  `;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;
  var TEST_FUNCTION;

  eval(output);

  TEST_FUNCTION({ key: 64 });

  expect(TEST_VARIABLE).toStrictEqual(64);
});

it("should fix destructuring in variable declarations", async () => {
  var code = `
  
  var {TEST_KEY} = {TEST_KEY: 50};

  TEST_VARIABLE = TEST_KEY;
  
  `;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(50);
});

it("should fix destructuring with rest elements", async () => {
  var code = `[...TEST_VARIABLE] = [1, 2, 3, 4, 5];`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual([1, 2, 3, 4, 5]);
});

it("should fix let/const", async () => {
  var code = `let TEST_VARIABLE = 100;`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  expect(output).not.toContain("let");
});
