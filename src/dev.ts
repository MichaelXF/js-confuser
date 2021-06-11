import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = readFileSync("./dev.input.js", "utf-8");

(async () => {
  for (var i = 0; i < 2000; i++) {
    console.log(i + 1, "/", 2000);

    var output = await JsConfuser.obfuscate(code, {
      target: "node",
      dispatcher: true,
      controlFlowFlattening: true,
    });
    writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

    try {
      eval(output);
    } catch (err) {
      console.error(err);

      process.exit(0);
    }
  }
})();
