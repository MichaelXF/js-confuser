import JsConfuser from "../../../src/index";

it("should convert arrow functions to function expressions", async () => {
  var code = `var arrow = ()=>"Hello World"`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  expect(output).not.toContain("=>");
});

it("should convert arrow functions and work", async () => {
  var code = `arrow = ()=>this;`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  // Ensure arrow function is gone
  expect(output).not.toContain("=>");

  expect(output).toContain("function");

  var arrow;

  eval(output);

  expect(typeof arrow).toStrictEqual("function");
  expect(arrow()).toBeTruthy();
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

it("should fix destructuring with default values", async () => {
  var code = `var {key: TEST_KEY = 50} = {key: undefined}; TEST_VARIABLE = TEST_KEY; `;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(50);
});

it("should fix destructuring inside the try...catch clause", async () => {
  var code = `
  try {

    throw {message: 100};

    // Why can you even do this?
  } catch ({message}) {
    
    TEST_VARIABLE = message;
  }
  `;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  var TEST_VARIABLE;

  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(100);
});

it("should fix let/const", async () => {
  var code = `let TEST_VARIABLE = 100;`;

  var output = await JsConfuser(code, { target: "browser", es5: true });

  expect(output).not.toContain("let");
});

it("should fix let with RenameVariables", async () => {
  var code = `
  
  if ( true ) {
    let TEST_VARIABLE = 100;
  }

  var check;
  try {
    TEST_VARIABLE
  } catch ( e ) {
    check = true;
  }

  input(check)

  `;

  var output = await JsConfuser(code, {
    target: "browser",
    es5: true,
    renameVariables: true,
  });

  expect(output).not.toContain("let");

  var value = "never_called";
  function input(x) {
    value = x;
  }

  eval(output);
  expect(value).toStrictEqual(true);
});

it("should add forEach polyfill", async () => {
  var code = `
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    es5: true,
  });

  expect(output).toContain("forEach");
});

it("should fix reserved keywords when used in properties", async () => {
  var code = `
  TEST_VARIABLE = {for: 1};
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    es5: true,
    minify: true,
  });

  expect(output).toContain("'for'");
});

it("should fix reserved keywords when used in member expressions", async () => {
  var code = `
  TEST_VARIABLE.for = 1;
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    es5: true,
    minify: true,
  });

  expect(output).toContain("['for']");
});
