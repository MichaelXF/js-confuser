import { readFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var ES6_JS = readFileSync(join(__dirname, "./ES6.src.js"), "utf-8");

test("Variant #1: ES6 code on High Preset", async () => {
  var { code: output } = await JsConfuser.obfuscate(ES6_JS, {
    target: "node",
    preset: "high",
    pack: true,
  });

  // The 'use strict' directive is removed due to being packed

  var ranAllTest = false;
  eval(output);

  // 'ranAllTest' is set to TRUE by the evaluated code
  expect(ranAllTest).toStrictEqual(true);
});

test("Variant #2: ES6 code on High Preset + RGF + Self Defending", async () => {
  var { code: output } = await JsConfuser.obfuscate(ES6_JS, {
    target: "node",
    preset: "high",
    rgf: true,
    lock: {
      selfDefending: true,
      countermeasures: "countermeasures",
    },
  });

  var ranAllTest = false;
  eval(output);

  // 'ranAllTest' is set to TRUE by the evaluated code
  expect(ranAllTest).toStrictEqual(true);
});
