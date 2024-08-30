import JsConfuser from "../../../src/index";

test("Variant #1: Work with startDate and call countermeasures function", async () => {
  var { code } = await JsConfuser.obfuscate(
    ` function countermeasures(){ input(true) } `,
    {
      target: "node",
      lock: {
        startDate: Date.now() + 1000 * 60 * 60 * 24, // one day in the future
        countermeasures: "countermeasures",
      },
    }
  );

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(code);
  expect(value).toStrictEqual(true);
});

test("Variant #2: Don't call countermeasures if the time is correct", async () => {
  var { code } = await JsConfuser.obfuscate(
    ` function countermeasures(){ input(true) } `,
    {
      target: "node",
      lock: {
        startDate: Date.now() - 1000 * 60 * 60 * 24, // one day in the past
        endDate: Date.now() + 1000 * 60 * 60 * 24, // one day in the future (2-day window to run this code)
        countermeasures: "countermeasures",
      },
    }
  );

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(code);
  expect(value).toStrictEqual("never_called");
});

test("Variant #3: Work with endDate and call countermeasures function", async () => {
  var { code } = await JsConfuser.obfuscate(
    ` function countermeasures(){ input(true) } `,
    {
      target: "node",
      lock: {
        endDate: Date.now() - 1000 * 60 * 60 * 24, // one day in the past
        countermeasures: "countermeasures",
      },
    }
  );

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(code);
  expect(value).toStrictEqual(true);
});

test("Variant #4: Countermeasures function should still work even with renameVariables enabled", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    ` function countermeasures(){ input(true) } `,
    {
      target: "node",
      renameVariables: true,
      renameGlobals: true, // <- `countermeasures` is top level name
      lock: {
        endDate: Date.now() - 1000 * 60 * 60 * 24, // always in the past, therefore countermeasures will always be called
        countermeasures: "countermeasures",
      },
    }
  );

  // ensure function was renamed
  expect(output).not.toContain("countermeasures");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(true);
});
