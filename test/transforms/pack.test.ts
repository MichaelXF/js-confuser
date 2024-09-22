import JsConfuser from "../../src";

test("Variant #1: Pack output code", async () => {
  var { code } = await JsConfuser.obfuscate(`TEST_OUTPUT = "Correct Value"`, {
    target: "node",
    pack: true,
  });

  expect(code.startsWith("Function")).toStrictEqual(true);

  var TEST_OUTPUT;

  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #2: Handle import statements", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    import { createHash } from "crypto";

    var inputString = "Hash this string";
    var hashed = createHash("sha256").update(inputString).digest("hex");
    TEST_OUTPUT = hashed;
    `,
    {
      target: "node",
      pack: true,
    }
  );

  // Ensure the import declaration wasn't moved
  expect(code.startsWith("import")).toStrictEqual(true);

  // Convert to runnable code
  code = code.replace(
    `import{createHash}from"crypto";`,
    "const {createHash}=require('crypto');"
  );

  var TEST_OUTPUT = "";

  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(
    "1cac63f39fd68d8c531f27b807610fb3d50f0fc3f186995767fb6316e7200a3e"
  );
});

test("Variant #3: Allow custom implementation to preserve globals", async () => {
  var globalsCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    TEST_OUTPUT = atob("SGVsbG8gV29ybGQ=")
    `,
    {
      target: "node",
      pack: (name) => {
        globalsCollected.push(name);
        if (name === "atob") return false;
        return true;
      },
      globalVariables: new Set([]),
    }
  );

  expect(globalsCollected).toContain("atob");
  expect(code).toContain("Function");
  expect(code).toContain("atob(");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});
