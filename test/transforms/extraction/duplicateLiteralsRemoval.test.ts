import JsConfuser from "../../../src/index";

test("Variant #1: Remove duplicate literals", async () => {
  var code = `
  
  var TEST_ARRAY = [5,5];
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  expect(output).not.toContain("5,5");
  expect(output).toContain("5");
});

test("Variant #2: Remove duplicate literals and execute correctly", async () => {
  var code = `
  
  TEST_ARRAY = [5,5];
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  expect(output).not.toContain("5,5");
  expect(output).toContain("5");

  var TEST_ARRAY;

  eval(output);

  expect(TEST_ARRAY).toEqual([5, 5]);
});

test("Variant #3: Remove 'undefined' and 'null' values", async () => {
  var code = `
  
  TEST_ARRAY = [undefined,undefined,null,null];
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  expect(output).not.toContain("undefined,undefined");
  expect(output).toContain("undefined");

  expect(output).not.toContain("null,null");
  expect(output).toContain("null");

  var TEST_ARRAY;

  eval(output);

  expect(TEST_ARRAY).toEqual([undefined, undefined, null, null]);
});

test("Variant #4: Do not remove empty strings", async () => {
  var code = `
  
  TEST_ARRAY = ['','','',''];
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  expect(output).toContain("'','','',''");

  var TEST_ARRAY;

  eval(output);

  expect(TEST_ARRAY).toEqual(["", "", "", ""]);
});

test("Variant #5: Work with NaN values", async () => {
  var code = `
  
  TEST_ARRAY = [NaN];
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  var TEST_ARRAY;

  eval(output);

  expect(TEST_ARRAY[0] === TEST_ARRAY[0]).toStrictEqual(false);
});

test("Variant #6: Work on property keys", async () => {
  var code = `
  var myObject = {
    myKey: 100
  }

  var myObject2 = {
    myKey: 50
  }

  TEST_VAR = myObject.myKey;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  expect(output).toContain("]:100");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #7: Work on class keys", async () => {
  var code = `
  class MyClass {
    myMethod(){
      return 100;
    }
  }

  var myObject = new MyClass();

  TEST_VAR = myObject.myMethod();
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  expect(output).toContain("](){return 100}");

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #8: Do not encode constructor key", async () => {
  var code = `
  class MyClass {
    constructor(){
      TEST_VAR = 100;
    }
  }

  class MyClass2 {
    constructor(){
      TEST_VAR = 50;
    }
  }

  new MyClass();
  `;

  var output = await JsConfuser(code, {
    target: "node",
    duplicateLiteralsRemoval: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

// https://github.com/MichaelXF/js-confuser/issues/105
test("Variant #9: Undefined as variable name", async () => {
  var output = await JsConfuser(
    `
  var undefined = 0;
  var undefined = 1;
  `,
    { target: "node", duplicateLiteralsRemoval: true }
  );

  eval(output);
});
