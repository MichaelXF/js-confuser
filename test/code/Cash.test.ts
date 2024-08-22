import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var CASH_JS = readFileSync(join(__dirname, "./Cash.src.js"), "utf-8");

test("Variant #1: Cash.js on High Preset (Strict Mode)", async () => {
  var output = await JsConfuser(CASH_JS, {
    target: "node",
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
  for (var key in window) {
    global[key] = window[key];
  }

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

test("Variant #2: Cash.js on High Preset + Integrity + Self Defending + RGF + Tamper Protection", async () => {
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
  for (var key in window) {
    global[key] = window[key];
  }

  var output = await JsConfuser(CASH_JS, {
    target: "node",
    preset: "high",
    rgf: true,
    lock: {
      integrity: true,
      selfDefending: true,
      tamperProtection: true,
    },
  });

  try {
    // new Function() runs in non-strict mode
    new Function(output)();
  } catch (e) {
    var helperCode = `var document = {
    documentElement: {},
    createElement: () => {
      return { style: {} };
    },
  };
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
  };
  window.window = window;
  global.window = window;
  for (var key in window) {
    global[key] = window[key];
  }`;

    console.error(e);
    writeFileSync("dev.output.js", helperCode + "\n" + output, {
      encoding: "utf-8",
    });

    expect(true).toStrictEqual(false);
  }

  expect(window).toHaveProperty("cash");
});
