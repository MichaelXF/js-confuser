import JsConfuser from "../../../src/index";

it("should work", async () => {
  var output = await JsConfuser(`input("Hello World")`, {
    target: "node",
    stringCompression: true,
  });

  var value,
    input = (x) => (value = x);

  eval(output);

  expect(value).toStrictEqual("Hello World");
});
