import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var CASH_JS = readFileSync(join(__dirname, "./Cash.src.js"), "utf-8");

const handleError = (error, output) => {
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

  console.error(error);
  // writeFileSync("dev.output.js", helperCode + "\n" + output, {  encoding: "utf-8", });

  expect("An error occurred").toStrictEqual(null);
};

test("Variant #1: Cash.js on High Preset (Strict Mode)", async () => {
  var { code: output } = await JsConfuser.obfuscate(CASH_JS, {
    target: "node",
    preset: "high",
    pack: true,
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
    // Pack option allows the code to be executed in a strict mode
    eval(output);
  } catch (e) {
    handleError(e, output);
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

  const CountermeasuresCode = `
  function countermeasures() {
    throw new Error("countermeasures() was called");
  }
  `;

  var { code: output } = await JsConfuser.obfuscate(
    CountermeasuresCode + CASH_JS,
    {
      target: "node",
      preset: "high",
      pack: true,
      rgf: {
        value: true,
        limit: 10,
      },
      lock: {
        integrity: true,
        selfDefending: true,
        tamperProtection: true,
        countermeasures: "countermeasures",
      },
    }
  );

  try {
    // Pack option allows the code to be executed in a strict mode
    eval(output);
  } catch (e) {
    handleError(e, output);
  }

  expect(window).toHaveProperty("cash");
});
