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
