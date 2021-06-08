import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = readFileSync("./dev.input.js", "utf-8");

eval(code);

JsConfuser.obfuscate(code, {
  target: "node",
  preset: "high",

  globalConcealing: false,
  flatten: false,
  stack: true,
  opaquePredicates: false,
  dispatcher: false,
  controlFlowFlattening: false,

  stringConcealing: false,
  stringCompression: false,
  stringEncoding: false,
  stringSplitting: false,

  duplicateLiteralsRemoval: false,
  shuffle: false,
  calculator: false,
  movedDeclarations: false,
  minify: false,
  compact: false,

  verbose: true,
  deadCode: false,
  renameVariables: false,
  debugComments: true,
}).then((output) => {
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
