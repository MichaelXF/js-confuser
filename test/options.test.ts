import JsConfuser from "../src/index";

test("Variant #1: Accept percentages", async () => {
  var { code: output } = await JsConfuser.obfuscate(`var TEST_VARIABLE;`, {
    target: "node",
    renameGlobals: true,
    renameVariables: true,
    stringConcealing: 0.5,
  });

  expect(output).not.toContain("TEST_VARIABLE");
});

test("Variant #2: Accept probability arrays", async () => {
  var { code: output } = await JsConfuser.obfuscate(`var TEST_VARIABLE;`, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: ["hexadecimal", "mangled"], // half hexadecimal, half randomized
  });

  expect(output).not.toContain("TEST_VARIABLE");
});

test("Variant #3: Accept probability maps", async () => {
  var { code: output } = await JsConfuser.obfuscate(`var TEST_VARIABLE;`, {
    target: "node",
    renameVariables: true,
    renameGlobals: true,
    identifierGenerator: {
      // 25% each
      hexadecimal: 0.25,
      randomized: 0.25,
      mangled: 0.25,
      number: 0.25,
    },
  });

  expect(output).not.toContain("TEST_VARIABLE");
});

test("Variant #4: Work with compact set to false", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
      var a;
      var b;
      var c;
      `,
    {
      target: "node",
      compact: false,
    }
  );

  expect(output).toContain("\n");
  expect(output).toContain("var a;\nvar b;\nvar c;");
});

test("Variant #5: Work with compact set to true", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
      var a;
      var b;
      var c;
      `,
    {
      target: "node",
      compact: true,
    }
  );

  expect(output).not.toContain("\n");
  expect(output).not.toContain("\t");
  expect(output).toContain("var a;var b;var c;");
});

test("Variant #6: Work with debugComments enabled", async () => {
  var { code: output } = await JsConfuser.obfuscate(`var TEST_VARIABLE;`, {
    target: "node",
    renameGlobals: true,
    renameVariables: true,
    compact: false,
    debugComments: true,
  });

  expect(output).not.toContain("TEST_VARIABLE");
});

test("Variant #7: Error on invalid lock option", async () => {
  expect(
    JsConfuser.obfuscate(`var TEST_VARIABLE;`, {
      target: "node",
      lock: "invalid",
    } as any)
  ).rejects.toThrow();

  expect(
    JsConfuser.obfuscate(`var TEST_VARIABLE;`, {
      target: "node",
      lock: {
        invalidProperty: true,
      },
    } as any)
  ).rejects.toThrow();
});

test("Variant #8: Error on invalid target values", async () => {
  var invalid: any = {
    target: "__invalid__target__",
  };

  await expect(async () => {
    return await JsConfuser.obfuscate("5+5", invalid);
  }).rejects.toThrow();
});

test("Variant #9: Error when target property missing", async () => {
  var invalid: any = {
    objectExtraction: true,
  };

  await expect(async () => {
    return await JsConfuser.obfuscate("5+5", invalid);
  }).rejects.toThrow();
});

test("Variant #10: Error when invalid options are passed in", async () => {
  var invalid: any = {
    target: "browser",
    __invalid__prop__: true,
  };

  await expect(async () => {
    return await JsConfuser.obfuscate("5+5", invalid);
  }).rejects.toThrow();
});

test("Variant #11: Error when invalid startDate is passed in", async () => {
  var invalid: any = {
    target: "browser",
    lock: {
      startDate: "__invalid__date__object__",
    },
  };

  await expect(async () => {
    return await JsConfuser.obfuscate("5+5", invalid);
  }).rejects.toThrow();
});

test("Variant #12: Error when invalid endDate is passed in", async () => {
  var invalid: any = {
    target: "browser",
    lock: {
      endDate: "__invalid__date__object__",
    },
  };

  await expect(async () => {
    return await JsConfuser.obfuscate("5+5", invalid);
  }).rejects.toThrow();
});

test("Variant #13: Error when source code is not a string", async () => {
  await expect(async () => {
    return await JsConfuser.obfuscate({} as any, {
      target: "node",
      preset: "low",
    });
  }).rejects.toThrow();
});
