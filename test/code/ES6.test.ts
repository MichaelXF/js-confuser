import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var ES6_JS = readFileSync(join(__dirname, "./ES6.src.js"), "utf-8");

test.concurrent("Variant #1: ES6 code on High Preset", async () => {
  var output = await JsConfuser(ES6_JS, {
    target: "node",
    preset: "high",
  });

  // Ensure 'use strict' directive is preserved
  expect(output.startsWith("'use strict'")).toStrictEqual(true);

  var ranAllTest = false;
  eval(output);

  // 'ranAllTest' is set to TRUE by the evaluated code
  expect(ranAllTest).toStrictEqual(true);
});

test.concurrent(
  "Variant #2: ES6 code on High Preset + RGF + Self Defending",
  async () => {
    var output = await JsConfuser(ES6_JS, {
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
  }
);
