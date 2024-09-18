import { readFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var StrictMode_JS = readFileSync(
  join(__dirname, "./StrictMode.src.js"),
  "utf-8"
);

test("Variant #1: StrictMode on High Preset", async () => {
  var { code: output } = await JsConfuser.obfuscate(StrictMode_JS, {
    target: "node",
    preset: "high",
    pack: true,

    // Disable global concealing for testing purposes
    // TEST_OUTPUT does not live on the global object
    globalConcealing: (globalName) => globalName != "TEST_OUTPUT",
  });

  //writeFileSync("./dev.output.js", output);

  var TEST_OUTPUT = {};

  eval(output);

  expect(TEST_OUTPUT.count).toStrictEqual(10);
  expect(TEST_OUTPUT.globalStrictMode).toStrictEqual(true);
  expect(TEST_OUTPUT.directEvalResult).toStrictEqual(true);
  expect(TEST_OUTPUT.indirectEvalResult).toStrictEqual(false);
});
