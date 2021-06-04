import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var ES6_JS = readFileSync(join(__dirname, "./ES6.src.js"), "utf-8");

it("works with ES6 code on High Preset", async () => {
  var output = await JsConfuser(ES6_JS, {
    target: "node",
    globalConcealing: true,
    stringCompression: true,
    stringEncoding: true,
    duplicateLiteralsRemoval: true,
    shuffle: "hash",
    renameVariables: true,
    movedDeclarations: true,
    minify: true,
    stack: true,
  });

  (global as any).expect = expect;

  writeFileSync(join(__dirname, "ES6.output.js"), output, {
    encoding: "utf-8",
  });

  eval(output);
});
