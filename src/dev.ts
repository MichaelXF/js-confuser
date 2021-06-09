import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = readFileSync("./dev.input.js", "utf-8");

eval(code);

// {preset: "high"} twice errors
// Cannot read property 'GpIJHtL' of undefined
// Cannot set property 'length' of undefined

/**
 *  target: "node",
  preset: "high",
  opaquePredicates: false,
  stringSplitting: false,
  stringConcealing: false,
  stringCompression: false,
  stringEncoding: false,
  objectExtraction: false,
  calculator: false,
  controlFlowFlattening: false,

  Three times errors
  (node:8788) UnhandledPromiseRejectionWarning: ReferenceError: version is not defined
 */

// {preset: "high", duplicateLiteralsRemoval: false} twice infinte loops and no output

console.log(">");
JsConfuser.obfuscate(code, {
  target: "node",
  preset: "high",
}).then((output) => {
  console.log("<");
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
