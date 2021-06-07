import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = readFileSync("./dev.error.js", "utf-8");

eval(code);

JsConfuser.obfuscate(code, {
  target: "node",
  preset: "high",

  globalConcealing: true,
  flatten: true,
  stack: true,
  opaquePredicates: true,
  dispatcher: true,
  controlFlowFlattening: true,

  stringConcealing: false,
  stringCompression: false,
  stringEncoding: false,
  stringSplitting: false,

  deadCode: false,
  duplicateLiteralsRemoval: false,
  shuffle: false,
  calculator: false,
  movedDeclarations: false,
  minify: false,
  compact: false,

  verbose: true,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
