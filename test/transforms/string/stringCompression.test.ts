import JsConfuser from "../../../src/index";

test("Variant #1: Compress strings", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var str1 = "Hello World";
    var str2 = "Hello World";

    TEST_OUTPUT = str1 === str2 ? str1 : "No Match";
    `,
    {
      target: "node",
      stringCompression: true,
    }
  );

  // Ensure string was compressed
  expect(code).not.toContain("Hello World");

  // Ensure the code still works
  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});

test("Variant #2: Handle property keys", async () => {
  var code = `
  var myObject = {
    myKey: 100
  }

  TEST_VAR = myObject.myKey;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringCompression: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #3: Handle class keys", async () => {
  var code = `
  class MyClass {
    myMethod(){
      return 100;
    }
  }

  var myObject = new MyClass();

  TEST_VAR = myObject.myMethod();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringCompression: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #4: Don't encode constructor key", async () => {
  var code = `
  class MyClass {
    constructor(){
      TEST_VAR = 100;
    }
  }

  new MyClass();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringCompression: true,
  });

  var TEST_VAR;
  eval(output);

  expect(TEST_VAR).toStrictEqual(100);
});

test("Variant #5: Allow custom function option", async () => {
  var code = `
  TEST_OUTPUT_1 = "My String 1";
  TEST_OUTPUT_2 = "My String 2";
  TEST_OUTPUT_3 = "My String 3";
  `;

  var stringsFound: string[] = [];

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    stringCompression: (strValue) => {
      stringsFound.push(strValue);

      // Change all strings but "My String 2"
      return strValue !== "My String 2";
    },
  });

  // Ensure all strings were found
  expect(stringsFound).toContain("My String 1");
  expect(stringsFound).toContain("My String 2");
  expect(stringsFound).toContain("My String 3");

  // Ensure the strings got changed (except for "My String 2")
  expect(output).not.toContain('TEST_OUTPUT_1="My String 1"');
  expect(output).toContain('TEST_OUTPUT_2="My String 2"');
  expect(output).not.toContain('TEST_OUTPUT_3="My String 3"');

  // Make sure the code still works!
  var TEST_OUTPUT_1, TEST_OUTPUT_2, TEST_OUTPUT_3;

  eval(output);

  expect(TEST_OUTPUT_1).toStrictEqual("My String 1");
  expect(TEST_OUTPUT_2).toStrictEqual("My String 2");
  expect(TEST_OUTPUT_3).toStrictEqual("My String 3");
});

test("Variant #6: Template strings", async () => {
  var stringsCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    TEST_OUTPUT = \`Hello World\`
    `,
    {
      target: "node",
      stringConcealing: (strValue) => {
        stringsCollected.push(strValue);

        return true;
      },
    }
  );

  // Ensure the string got concealed
  expect(code).not.toContain("Hello World");

  // Ensure the custom implementation was called
  expect(stringsCollected).toContain("Hello World");

  // Ensure the code works
  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});

test("Variant #7: Work with Rename Variables", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var myVar = "Hello World";
    TEST_OUTPUT = myVar;
    `,
    {
      target: "node",
      stringCompression: true,
      renameVariables: true,
    }
  );

  // Ensure String Compression applied
  expect(code).not.toContain("Hello World");

  // Ensure the code still works
  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});

test("Variant #8: Work with RGF", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var myVar = "Hello World";
    TEST_OUTPUT = myVar;
    `,
    {
      target: "node",
      stringCompression: true,
      rgf: true,
      renameVariables: true,
    }
  );

  // Ensure String Compression applied
  expect(code).not.toContain("Hello World");

  // Ensure the code still works
  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});
