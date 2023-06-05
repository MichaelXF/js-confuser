import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";
import { ObfuscateOptions } from "../../src/options";

var SOURCE_JS = readFileSync(join(__dirname, "./Dynamic.src.js"), "utf-8");

test.concurrent("Variant #1: Dynamic.src.js on High Preset", async () => {
  // `input` is an embedded variable, therefore globalConcealing must be turned off
  var output = await JsConfuser(SOURCE_JS, {
    target: "browser",
    preset: "high",
    globalConcealing: false,
  });

  var value = "never_called";
  function input(x) {
    value = x;
  }

  eval(output);

  expect(value).toStrictEqual(1738.1738);
});

test.concurrent("Variant #2: Dynamic.src.js on 2x High Preset", async () => {
  var options: ObfuscateOptions = {
    target: "node",
    preset: "high",
    globalConcealing: false,
  };

  var output = await JsConfuser(SOURCE_JS, options);

  // writeFileSync("./dev.error.1.js", output, "utf-8");

  var doublyObfuscated = await JsConfuser(output, options);

  // writeFileSync("./dev.error.2.js", doublyObfuscated, "utf-8");

  var value = "never_called";
  function input(x) {
    value = x;
  }

  eval(doublyObfuscated);

  expect(value).toStrictEqual(1738.1738);
});
