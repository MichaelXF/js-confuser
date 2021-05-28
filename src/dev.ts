import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

// const Cash = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
console.log(1)
console.log(2)
console.log(3)
console.log(4)
console.log(5)
console.log(6)
console.log(7)
console.log(8)

`,
  {
    target: "browser",
    controlFlowFlattening: true,
    renameVariables: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);
});
