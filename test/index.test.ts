import JsConfuser from "../src/index";

it("should be a function", async () => {
  expect(typeof JsConfuser).toBe("function");
});

it("should return be an awaited string", async () => {
  var output = await JsConfuser("5+5", {
    target: "browser",
    opaquePredicates: true,
  });

  expect(typeof output).toBe("string");
});
