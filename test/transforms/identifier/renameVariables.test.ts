import JsConfuser from "../../../src/index";

it("should rename variables properly", async () => {
  var code = "var TEST_VARIABLE = 1;";
  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output.split("var ")[1].split("=")[0]).not.toEqual("TEST_VARIABLE");
  expect(output).not.toContain("TEST_VARIABLE");
});

it("should not rename global accessors", async () => {
  var code = `
  var TEST_VARIABLE = 1;
  success(TEST_VARIABLE); // success should not be renamed
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).toContain("success");

  var passed = false;
  function success() {
    passed = true;
  }
  eval(output);

  expect(passed).toStrictEqual(true);
});

it("should rename shadowed variables properly", async () => {
  var code = `
  var TEST_VARIABLE = 1;
  
  function run(){
    var TEST_VARIABLE = 10;
    input(TEST_VARIABLE);
  }

  run();
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(10);
});

it("should not rename member properties", async () => {
  var code = `

    var TEST_OBJECT = { TEST_PROPERTY: 100 }

    input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).toContain("TEST_PROPERTY");

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should handle variable defined with let (1)", async () => {
  var code = `

    // lexically bound
    let TEST_OBJECT = { TEST_PROPERTY: 100 }

    input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should handle variable defined with let (2)", async () => {
  var code = `

    // lexically bound
    let TEST_OBJECT = { TEST_PROPERTY: "UPPER_VALUE" }
    if ( true ) {
      let TEST_OBJECT = { TEST_PROPERTY: 100 }
      input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
    }

  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should handle variable defined with let (3)", async () => {
  var code = `

    // lexically bound
    let TEST_OBJECT = { TEST_PROPERTY: "UPPER_VALUE" }
    if ( true ) {
      let TEST_OBJECT = { TEST_PROPERTY: 100 }
      input(TEST_OBJECT.TEST_PROPERTY); // "TEST_PROPERTY" should not be renamed
    }

  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: "mangled",
  });

  expect(output).not.toContain("TEST_OBJECT");
  expect(output).toContain("TEST_PROPERTY");
  expect(output).toContain("input");
  expect(output).toContain("let A");
  expect(typeof output.split("let A")[1]).toStrictEqual("string");

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(100);
});

it("should not rename null (reservedIdentifiers)", async () => {
  var code = `
    input(null)
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
  });

  var value = false;
  function input(valueIn) {
    value = valueIn;
  }
  eval(output);

  expect(value).toStrictEqual(null);
});

it("should not rename exported names", async () => {
  var code = `
    export function abc(){

    }
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    renameVariables: true,
    renameGlobals: true,
  });

  expect(output).toContain("abc");
});
