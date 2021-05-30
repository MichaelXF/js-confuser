import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var CASH_JS = readFileSync(join(__dirname, "./Cash.src"), "utf-8");

it("works with Cash.js on High Preset", async () => {
  var output = await JsConfuser(CASH_JS, {
    target: "browser",
    preset: "high",
    // stringEncoding: true,
    // stringConcealing: true,
    // stringSplitting: true,
    // controlFlowFlattening: true,
    // deadCode: true,
    // duplicateLiteralsRemoval: true,
    // calculator: true,
    // shuffle: "hash",
    // objectExtraction: true,
    // renameVariables: true,
    // stack: true,
    // dispatcher: true,
    // flatten: true,
    // controlFlowFlattening: true,
  });

  // Make the required document variables for initialization
  var document = {
    documentElement: {},
    createElement: () => {
      return { style: {} };
    },
  } as any as Document;
  var window = {
    document,
    Array,
    Object,
    Symbol,
    Number,
    parseInt,
    JSON,
    setTimeout,
    encodeURIComponent,
    RegExp,
    String,
    $: false,
  } as any;
  window.window = window;

  // writeFileSync(join(__dirname, "Cash.output"), output, { encoding: "utf-8" });

  eval(output);

  expect(window).toHaveProperty("cash");
});
