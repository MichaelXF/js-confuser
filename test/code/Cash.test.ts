import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var CASH_JS = readFileSync(join(__dirname, "./Cash.src.js"), "utf-8");

test("Variant #1: Cash.js on High Preset (Strict Mode)", async () => {
  var output = await JsConfuser(CASH_JS, {
    target: "browser",
    preset: "high",
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
  global.window = window;

  try {
    eval(output);
  } catch (e) {
    console.error(e);
    writeFileSync("dev.output.js", output, {
      encoding: "utf-8",
    });

    expect(true).toStrictEqual(false);
  }

  expect(window).toHaveProperty("cash");
});
