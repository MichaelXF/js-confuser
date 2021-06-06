import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `
var result = 1 + 1;
console.log("1 + 1 is " + result);
console.log("The source code is only three lines long!");


`;

eval(code);

JsConfuser.obfuscate(code, {
  target: "node",
  preset: "high",
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
