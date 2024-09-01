import JsConfuser from "../../../src";
import { CustomStringEncoding } from "../../../src/options";
import Template from "../../../src/templates/template";
import { stringLiteral } from "@babel/types";
import { shuffle } from "../../../src/utils/random-utils";
import { writeFileSync } from "fs";

test("Variant #1: Custom Base64 encoding", async () => {
  var code = `
    var myString = "Hello World!";
    TEST_OUTPUT = myString;
  `;

  var stringsCollected: string[] = [];

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringConcealing: true,
    customStringEncodings: [
      {
        code: `
        function {fnName}(encoded) {
          return Buffer.from(encoded, 'base64').toString('utf-8');
        }
        `,
        encode: (inputStr) => {
          stringsCollected.push(inputStr);

          return Buffer.from(inputStr).toString("base64");
        },
      },
    ],
  });

  // Ensure encoder function was called
  expect(stringsCollected).toContain("Hello World!");

  // Ensure string was concealed
  expect(output).not.toContain("Hello World!");

  // Ensure decoder function was placed into the output
  expect(output).toContain("Buffer.from");
  expect(output).toContain("base64");
  expect(output).toContain("SGVsbG8gV29ybGQh");

  // Ensure the output is correct
  var TEST_OUTPUT;

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Hello World!");
});

test("Variant #2: Custom Randomized Base64 encoding", async () => {
  var stringsCollected: string[] = [];

  function createCustomStringEncoding(): CustomStringEncoding {
    function encode(input, charset) {
      const inputBuffer = new TextEncoder().encode(input);
      let output = "";

      for (let i = 0; i < inputBuffer.length; i += 3) {
        const chunk = [inputBuffer[i], inputBuffer[i + 1], inputBuffer[i + 2]];

        const binary = (chunk[0] << 16) | (chunk[1] << 8) | (chunk[2] || 0);

        output += charset[(binary >> 18) & 0x3f];
        output += charset[(binary >> 12) & 0x3f];
        output +=
          typeof chunk[1] !== "undefined" ? charset[(binary >> 6) & 0x3f] : "=";
        output +=
          typeof chunk[2] !== "undefined" ? charset[binary & 0x3f] : "=";
      }

      return output;
    }

    const customCharset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const shuffledCharset = shuffle(customCharset.split("")).join("");

    return {
      template: new Template(`
        // Creates a reverse lookup table from the given charset
        function createReverseCharset(charset) {
          if (charset.length !== 64) {
            throw new Error("Charset must be exactly 64 characters long.");
          }
          const reverseCharset = {};
          for (let i = 0; i < charset.length; i++) {
            reverseCharset[charset[i]] = i;
          }
          return reverseCharset;
        }

function decode(input, charset) {
    const reverseCharset = createReverseCharset(charset);
    const cleanedInput = input.replace(/=+$/, '');  // Remove padding

    const byteArray = [];
    let buffer = 0;
    let bitsCollected = 0;

    for (let i = 0; i < cleanedInput.length; i++) {
        buffer = (buffer << 6) | reverseCharset[cleanedInput[i]];
        bitsCollected += 6;

        if (bitsCollected >= 8) {
            bitsCollected -= 8;
            byteArray.push((buffer >> bitsCollected) & 0xFF);
        }
    }

    // Convert to string, ensuring no extra characters
    return new TextDecoder().decode(Uint8Array.from(byteArray));
}

var {fnName} = (str) => decode(str, {shuffledCharset});

        `).setDefaultVariables({
        shuffledCharset: stringLiteral(shuffledCharset),
      }),
      encode: (input) => {
        stringsCollected.push(input);
        return encode(input, shuffledCharset);
      },

      // Identity key to help distinguish between different variants
      identity: shuffledCharset,
    };
  }

  var sourceCode = `
  TEST_OUTPUT = [
    "Hello World! (1)",
    "Hello World! (2)",
    "Hello World! (3)",
    "Hello World! (4)",
    "Hello World! (5)",
    "Hello World! (6)",
    "Hello World! (7)",
    "Hello World! (8)",
    "Hello World! (9)",
    "Hello World! (10)"
  ]
  `;

  var { code } = await JsConfuser.obfuscate(sourceCode, {
    target: "node",
    stringConcealing: true,
    customStringEncodings: [createCustomStringEncoding],
  });

  var TEST_OUTPUT;
  eval(code);

  writeFileSync("./dev.output.js", code, "utf-8");

  expect(Array.isArray(TEST_OUTPUT)).toStrictEqual(true);

  for (var i = 1; i <= 10; i++) {
    var testString = `Hello World! (${i})`;
    expect(stringsCollected).toContain(testString);
    expect(code).not.toContain(testString);
    expect(TEST_OUTPUT).toContain(testString);
  }
});

test("Variant #3: Skip strings that fail to decode", async () => {
  var stringsCollected: string[] = [];

  var customStringEncoding: CustomStringEncoding = {
    code: `
    function {fnName}(input){
      return Buffer.from(input, 'base64').toString('utf-8');
    }
    `,
    decode: (input) => {
      return Buffer.from(input, "base64").toString("utf-8");
    },
    encode: (input) => {
      stringsCollected.push(input);

      if (input === "Broken String") return "Invalid Base64";

      return Buffer.from(input, "utf-8").toString("base64");
    },
  };

  var sourceCode = `
    var myString = "Hello World!";
    var brokenString = "Broken String";
    TEST_OUTPUT = [myString, brokenString];
  `;

  var { code } = await JsConfuser.obfuscate(sourceCode, {
    target: "node",
    stringConcealing: true,
    customStringEncodings: [customStringEncoding],
  });

  expect(stringsCollected).toContain("Hello World!");
  expect(stringsCollected).toContain("Broken String");

  expect(code).not.toContain("Hello World!");
  expect(code).toContain("Broken String");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(["Hello World!", "Broken String"]);
});
