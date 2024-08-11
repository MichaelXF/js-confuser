import JsConfuser from "../src/index";

describe("options", () => {
  test("Variant #1: Accept percentages", async () => {
    var output = await JsConfuser(`var TEST_VARIABLE;`, {
      target: "node",
      renameGlobals: true,
      renameVariables: true,
      stringConcealing: 0.5,
    });

    expect(output).not.toContain("TEST_VARIABLE");
  });

  test("Variant #2: Accept probability arrays", async () => {
    var output = await JsConfuser(`var TEST_VARIABLE;`, {
      target: "node",
      renameVariables: true,
      renameGlobals: true,
      identifierGenerator: ["hexadecimal", "mangled"], // half hexadecimal, half randomized
    });

    expect(output).not.toContain("TEST_VARIABLE");
  });

  test("Variant #3: Accept probability maps", async () => {
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

  test("Variant #4: Work with compact false", async () => {
    var output = await JsConfuser(`var TEST_VARIABLE;`, {
      target: "node",
      renameGlobals: true,
      renameVariables: true,
      compact: false,
    });

    expect(output).not.toContain("TEST_VARIABLE");
  });

  test("Variant #5: Work with indent set to 2 spaces", async () => {
    var output = await JsConfuser(`var TEST_VARIABLE;`, {
      target: "node",
      renameGlobals: true,
      renameVariables: true,
      compact: false,
      indent: 2,
    });

    expect(output).not.toContain("TEST_VARIABLE");
  });

  test("Variant #6: Work with debugComments enabled", async () => {
    var output = await JsConfuser(`var TEST_VARIABLE;`, {
      target: "node",
      renameGlobals: true,
      renameVariables: true,
      compact: false,
      indent: 2,
      debugComments: true,
    });

    expect(output).not.toContain("TEST_VARIABLE");
  });

  test("Variant #7: Error on invalid lock option", async () => {
    expect(
      JsConfuser(`var TEST_VARIABLE;`, {
        target: "node",
        lock: "invalid",
      } as any)
    ).rejects.toThrow();

    expect(
      JsConfuser(`var TEST_VARIABLE;`, {
        target: "node",
        lock: {
          invalidProperty: true,
        },
      } as any)
    ).rejects.toThrow();
  });
});

describe("options.preserveFunctionLength", () => {
  test("Variant #1: Enabled by default", async () => {
    var output = await JsConfuser(
      `
    function myFunction(a, b, c, d = "") {
      // Function.length = 3
    }

    TEST_OUTPUT = myFunction.length; // 3
    `,
      {
        target: "node",
        preset: "high",
      }
    );

    var TEST_OUTPUT;
    eval(output);
    expect(TEST_OUTPUT).toStrictEqual(3);
  });

  test("Variant #2: Disabled", async () => {
    var output = await JsConfuser(
      `
    function myFunction(a, b, c, d = "") {
      // Function.length = 3
    }

    TEST_OUTPUT = myFunction.length; // 3
    `,
      {
        target: "node",
        preset: "high",
        preserveFunctionLength: false,

        stringEncoding: false,
        stringCompression: false,
        stringConcealing: false,
        stringSplitting: false,
        deadCode: false,
        duplicateLiteralsRemoval: false,

        rgf: true,
      }
    );

    expect(output).not.toContain("defineProperty");

    var TEST_OUTPUT;
    eval(output);
    expect(TEST_OUTPUT).not.toStrictEqual(3);
  });
});
