import { writeFileSync } from "fs";
import JsConfuser from "../../src";

test("Variant #1: Import Declaration on High Preset", async () => {
  let { code } = await JsConfuser.obfuscate(
    `
    import { createHash } from "node:crypto";

    var inputString = "Hash this string";
    var hashed = createHash("sha256").update(inputString).digest("hex");
    TEST_OUTPUT = hashed;

    console.log(TEST_OUTPUT)
    `,
    {
      target: "node",
      pack: true,

      preset: "high",

      //
      renameVariables: false,
    }
  );

  // Ensure the import declaration wasn't moved
  expect(code.startsWith("import")).toStrictEqual(true);

  // Convert to runnable code
  code = code
    .replace(`import{createHash as `, "let {createHash: ")
    .replace(`}from"node:crypto";`, "} = require('crypto');")

    // (When Rename Variables is disabled)
    .replace(
      "import{createHash} = require('crypto');",
      "let {createHash} = require('crypto');"
    );

  writeFileSync("./dev.output.js", code, "utf-8");

  console.log(code.slice(0, 100));

  var TEST_OUTPUT = "";

  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(
    "1cac63f39fd68d8c531f27b807610fb3d50f0fc3f186995767fb6316e7200a3e"
  );
});
