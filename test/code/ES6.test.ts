import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

const ES6_JS = readFileSync(join(__dirname, "./ES6.src.js"), "utf-8");
const EXPECTED_RESULT = {
  "Variant #1": true,
  "Variant #2": true,
  "Variant #3": true,
  "Variant #4": true,
  "Variant #5": true,
  "Variant #6": true,
  "Variant #7": true,
  "Variant #8": true,
  "Variant #9": true,
  "Variant #10": true,
  "Variant #11": true,
  "Variant #12": true,
  "Variant #13": true,
  "Variant #14": true,
  "Variant #15": [true, true, true, true, true],
  "Variant #16: #1": true,
  "Variant #16: #2": true,
  "Variant #16: #3": true,
  "Variant #17": true,
  "Variant #18": true,
  "Variant #19": true,
  "Variant #20": true,
};

test("Variant #1: ES6 code on High Preset", async () => {
  const { code } = await JsConfuser.obfuscate(ES6_JS, {
    target: "node",
    preset: "high",
    pack: true,
  });

  const TEST_OUTPUT = {};
  eval(code);
  expect(TEST_OUTPUT).toStrictEqual(EXPECTED_RESULT);
});

test("Variant #2: ES6 code on High Preset + RGF + Self Defending + Tamper Protection + Integrity", async () => {
  const { code } = await JsConfuser.obfuscate(ES6_JS, {
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
  });

  writeFileSync("./dev.output.js", code, "utf-8");

  const TEST_OUTPUT = {};
  eval(code);
  expect(TEST_OUTPUT).toStrictEqual(EXPECTED_RESULT);
});
