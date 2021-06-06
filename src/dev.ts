import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `

var b = {b: 2};
var d = {e:2};
var c = {a: 1,...b,c:2,...d}

console.log(c)

`;

JsConfuser.obfuscate(code, {
  target: "node",
  es5: true,
  compact: false,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
