import { readFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var SOURCE_JS = readFileSync(join(__dirname, "./Dynamic.src.js"), "utf-8");

test("Variant #1: Dynamic.src.js on High Preset", async () => {
  // `input` is an embedded variable, therefore globalConcealing must be turned off
  var { code: output } = await JsConfuser.obfuscate(SOURCE_JS, {
    target: "browser",
    preset: "high",
    globalConcealing: false,
    pack: true,
  });

  var value = "never_called";
  function input(x) {
    value = x;
  }

  eval(output);

  expect(value).toStrictEqual(1738.1738);
});
