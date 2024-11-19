import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";
import { ok } from "assert";

var AES_JS = readFileSync(join(__dirname, "./AES.src.js"), "utf-8");

test("Variant #1: AES-JS on 'High' Preset", async () => {
  var { code } = await JsConfuser.obfuscate(AES_JS, {
    target: "node",
    preset: "high",
  });

  // Simulate Node-JS Module import
  var exports = {};
  var module = { exports };
  var require = () => {
    ok(false, "require() is disabled");
  };

  eval(code);

  // Module.exports is now AES-JS
  var aesjs = module.exports;

  // Ensure that the module is properly loaded
  expect(typeof aesjs).toStrictEqual("object");
  expect(Object.keys(aesjs)).toStrictEqual([
    "AES",
    "Counter",
    "ModeOfOperation",
    "utils",
    "padding",
    "_arrayTest",
  ]);
  expect(Object.keys(aesjs.utils.hex)).toStrictEqual(["toBytes", "fromBytes"]);
  expect(Object.keys(aesjs.utils.utf8)).toStrictEqual(["toBytes", "fromBytes"]);
  expect(Object.keys(aesjs.ModeOfOperation)).toStrictEqual([
    "ecb",
    "cbc",
    "cfb",
    "ofb",
    "ctr",
  ]);

  // Test AES Encryption/Decryption

  // An example 256-bit key
  var key = Buffer.from(
    "55e3af2655dd72b9f32456042f39bae9accff6259159e608be55a1aa313c598d",
    "hex"
  );

  // Convert text to bytes
  var text = "Text may be any length you wish, no padding is required.";
  var textBytes = aesjs.utils.utf8.toBytes(text);

  // The counter is optional, and if omitted will begin at 1
  var aesCtr = new aesjs.ModeOfOperation.ctr(key);
  var encryptedBytes = aesCtr.encrypt(textBytes);

  // To print or store the binary data, you may convert it to hex
  var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
  expect(encryptedHex).toStrictEqual(
    "7a0ed7de317642c742bf4d0e3bfead255a2a986e86644b7c14b2fd54feea5cea06970e41e6e391a3d653ae836e7240147f547b028df59efb"
  );
  // "7a0ed7de317642c742bf4d0e3bfead255a2a986e86644b7c14b2fd54feea5cea06970e41e6e391a3d653ae836e7240147f547b028df59efb

  // When ready to decrypt the hex string, convert it back to bytes
  var encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);

  // The counter mode of operation maintains internal state, so to
  // decrypt a new instance must be instantiated.
  var aesCtr = new aesjs.ModeOfOperation.ctr(key);
  var decryptedBytes = aesCtr.decrypt(encryptedBytes);

  // Convert our bytes back into text
  var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
  expect(decryptedText).toStrictEqual(
    "Text may be any length you wish, no padding is required."
  );
  // "Text may be any length you wish, no padding is required."
});
