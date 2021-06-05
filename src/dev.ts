import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

JsConfuser.obfuscate(
  `
  console.log(1)
  console.log(2)
  console.log(3)
  console.log(4)
  console.log(5)
  console.log(6)

`,
  {
    target: "node",
    opaquePredicates: true,
    controlFlowFlattening: true,
    renameVariables: true,
    identifierGenerator: {
      hexadecimal: 0.25,
      randomized: 0.25,
      number: 0.25,
      mangled: 0.25,
    },
    minify: true,
    verbose: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);
  eval(obfuscated);
  // writeFileSync("./dev.error.js", obfuscated, { encoding: "utf-8" });
});
