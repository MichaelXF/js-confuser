import JsConfuser from "../../../src/index";

test("Variant #1: Run correctly", async () => {
  var code = `
  function TEST_FUNCTION(){
    input_test1(true) 
  }

  TEST_FUNCTION();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    lock: { integrity: true, countermeasures: false },
  });

  expect(output).toContain("function");

  var value = "never_called";
  function input_test1(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual(true);
});

test("Variant #2: Don't run when source code is modified", async () => {
  var code = `
  function TEST_FUNCTION(){
    input("Hello World") 
  }

  TEST_FUNCTION();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    lock: { integrity: true, countermeasures: false },
  });

  expect(output).toContain("function");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  // Change the "Hello World" to "Goodnight"
  output = output.replace("Hello World", "Goodnight");

  eval(output);

  expect(value).not.toEqual("Goodnight");

  expect(value).toStrictEqual("never_called");
});

test("Variant #3: Run countermeasures function when changed", async () => {
  var code = `
  function TEST_FUNCTION(){
    input("The code was never changed") 
  }

  function TEST_COUNTERMEASURES(){
    input("countermeasures")
  }

  TEST_FUNCTION();
  
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    lock: { integrity: true, countermeasures: "TEST_COUNTERMEASURES" },
  });

  expect(output).toContain("function");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  // Change the "Hello World" to "Goodnight"
  output = output.replace(
    "The code was never changed",
    "The modified code was executed"
  );

  eval(output);

  expect(value).toStrictEqual("countermeasures");
});

test("Variant #4: Error when countermeasures function doesn't exist", async () => {
  var code = `
  function TEST_FUNCTION(){
    input("The code was never changed") 
  }

  TEST_FUNCTION();
  `;

  var errorCaught;
  try {
    var { code: output } = await JsConfuser.obfuscate(code, {
      target: "node",
      lock: { integrity: true, countermeasures: "TEST_COUNTERMEASURES" },
    });
  } catch (e) {
    errorCaught = e;
  }

  expect(errorCaught).toBeTruthy();
  expect(errorCaught.toString()).toContain(
    "Countermeasures function named 'TEST_COUNTERMEASURES' was not found."
  );
  expect(errorCaught.toString()).toContain("TEST_COUNTERMEASURES");
});

test("Variant #5: Work on High Preset", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `TEST_OUTPUT = ("Hello World")`,
    {
      target: "node",
      preset: "high",
      lock: {
        integrity: true,
      },
    }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});

test("Variant #6: Work with RGF enabled", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  function getTestOutput(){
    return "Hello World";
  }

  TEST_OUTPUT = getTestOutput();
  `,
    {
      target: "node",
      rgf: true,
      lock: {
        integrity: true,
      },
    }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Hello World");
});
