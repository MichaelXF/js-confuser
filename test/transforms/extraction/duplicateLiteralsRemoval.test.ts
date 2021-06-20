import JsConfuser from "../../../src/index";

it("should remove duplicate literals", async () => {
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

it("should remove duplicate literals and execute correctly", async () => {
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

it("should remove 'undefined' and 'null' values", async () => {
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

it("should not remove empty strings", async () => {
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

it("should work with NaN values", async () => {
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
