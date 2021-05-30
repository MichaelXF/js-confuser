import JsConfuser from "../src/index";

it("should accept percentages", async () => {
  var output = await JsConfuser(`var TEST_VARIABLE;`, {
    target: "node",
    renameVariables: true,
    stringConcealing: 0.5,
  });

  expect(output).not.toContain("TEST_VARIABLE");
});

it("should accept probability arrays", async () => {
  var output = await JsConfuser(`var TEST_VARIABLE;`, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: ["hexadecimal", "mangled"], // half hexadecimal, half randomized
  });

  expect(output).not.toContain("TEST_VARIABLE");
});

it("should accept probability maps", async () => {
  var output = await JsConfuser(`var TEST_VARIABLE;`, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: {
      // 25% each
      hexadecimal: 0.25,
      randomized: 0.25,
      mangled: 0.25,
      number: 0.25,
    },
  });

  expect(output).not.toContain("TEST_VARIABLE");
});
