import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `
console.log(1)
console.log(2)
console.log(3)
console.log(4)
console.log(5)
console.log(6)
console.log(7)
console.log(8)
console.log(9)
console.log(10)



`;

eval(code);

JsConfuser.obfuscate(code, {
  target: "node",
  controlFlowFlattening: true,
  compact: false,
  renameVariables: true,
  identifierGenerator: "mangled",
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
