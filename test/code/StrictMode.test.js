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
  });

  //writeFileSync("./dev.output.js", output);

  eval(output);
});
