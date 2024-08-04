import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var StrictMode_JS = readFileSync(
  join(__dirname, "./StrictMode.src.js"),
  "utf-8"
);

test("Variant #1: StrictMode on High Preset", async () => {
  var output = await JsConfuser(StrictMode_JS, {
    target: "node",
    preset: "high",
  });

  //writeFileSync("./dev.output.js", output);

  eval(output);
});

test("Variant #2: StrictMode on 2x High Preset", async () => {
  var output = await JsConfuser(StrictMode_JS, {
    target: "node",
    preset: "high",
  });

  //writeFileSync("./dev.output1.js", output);

  var output2 = await JsConfuser(output, {
    target: "node",
    preset: "high",
  });

  //writeFileSync("./dev.output2.js", output2);

  eval(output2);
});
