import JsConfuser from "../../../src/index";

test("Variant #1: Encode strings", async () => {
  var code = `var TEST_STRING = "encoded."`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringEncoding: true,
  });

  expect(output).not.toContain("encoded.");

  expect(
    output.includes(
      "\\u0065\\u006e\\u0063\\u006f\\u0064\\u0065\\u0064\\u002e"
    ) || output.includes("\\x65\\x6e\\x63\\x6f\\x64\\x65\\x64\\x2e")
  ).toStrictEqual(true);
});

test("Variant #2: Encode strings AND still have same result", async () => {
  var code = `input("encoded.")`;

  var output = await JsConfuser(code, {
    target: "browser",
    stringEncoding: true,
  });

  expect(output).not.toContain("encoded.");

  expect(
    output.includes(
      "\\u0065\\u006e\\u0063\\u006f\\u0064\\u0065\\u0064\\u002e"
    ) || output.includes("\\x65\\x6e\\x63\\x6f\\x64\\x65\\x64\\x2e")
  ).toStrictEqual(true);

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual("encoded.");
});

test("Variant #3: Encode object property keys", async () => {
  var code = `TEST_OUTPUT = { myProperty1: true, "myProperty2": true }`;

  var output = await JsConfuser(code, { target: "node", stringEncoding: true });

  // Ensure the strings got changed
  expect(output).not.toContain("myProperty1");
  expect(output).not.toContain("myProperty2");

  // Ensure output is exactly the same
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual({ myProperty1: true, myProperty2: true });
});

test("Variant #4: Encode object destructuring property keys", async () => {
  var code = `({ ["myDestructedKey"]: TEST_OUTPUT } = { myDestructedKey: true })`;

  var output = await JsConfuser(code, { target: "node", stringEncoding: true });

  // Ensure the string(s) got changed
  expect(output).not.toContain("myDestructedKey");

  // Ensure output is exactly the same
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

// This test multiple transformations
test("Variant #5: Preserve 'use strict' directive", async () => {
  var code = `
  "use strict";

  var filler1;
  var filler2;
  var filler3;

  var anotherVar = "use strict";
  `;

  var output = await JsConfuser(code, {
    target: "node",
    preset: "high",
  });

  expect(output.startsWith("'use strict'")).toStrictEqual(true);
});
