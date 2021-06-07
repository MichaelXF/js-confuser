import JsConfuser from "../../../src/index";

it("should remove duplicate literals", async () => {
  var code = `
  
  var TEST_ARRAY = [5,5];
  `;

  var output = await JsConfuser(code, {
    target: "browser",
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
    target: "browser",
    duplicateLiteralsRemoval: true,
  });

  expect(output).not.toContain("5,5");
  expect(output).toContain("5");

  var TEST_ARRAY;

  eval(output);

  expect(TEST_ARRAY).toEqual([5, 5]);
});
