import JsConfuser from "../src/index";
import { ObfuscateOptions } from "../src/options";

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
    identifierGenerator: [
      "hexadecimal",
      "mangled",
    ] as ObfuscateOptions["identifierGenerator"], // half hexadecimal, half randomized
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

test("Variant #6: Verbose option", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var object = { key: 1 };
    TEST_OUTPUT = object.key; 
    `,
    {
      target: "node",
      compact: false,
      verbose: true,
      objectExtraction: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(1);
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

test("Variant #14: Rename Globals should accept a callback function", async () => {
  var globalsCollected: string[] = [];
  var { code } = await JsConfuser.obfuscate(
    `
    var renameMe = true;
    var doNotRenameMe = false;

    TEST_OUTPUT = [renameMe, doNotRenameMe]
    `,
    {
      target: "node",
      renameVariables: true,
      renameGlobals: (globalName) => {
        globalsCollected.push(globalName);

        if (globalName === "doNotRenameMe") {
          return false;
        }

        return true;
      },
    }
  );

  // Ensure renameGlobals callback was called
  expect(globalsCollected).toContain("renameMe");
  expect(globalsCollected).toContain("doNotRenameMe");

  // Ensure code was changed correctly
  expect(code).not.toContain("renameMe");
  expect(code).toContain("doNotRenameMe");

  // Ensure code still works
  var TEST_OUTPUT;

  eval(code);

  expect(TEST_OUTPUT).toStrictEqual([true, false]);
});

test("Variant #15: Fine-tune options using the limit property", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var renameMyVar1 = 1;
    var renameMyVar2 = 2;
    var keepMyVar3 = 3;
    var keepMyVar4 = 4;
    var keepMyVar5 = 5;
    `,
    {
      target: "node",
      renameVariables: {
        value: true,
        limit: 2,
      },
      identifierGenerator: "mangled",
    }
  );

  // Ensure the first two variables were renamed
  expect(code).not.toContain("renameMyVar1");
  expect(code).not.toContain("renameMyVar2");

  expect(code).toContain("var a");
  expect(code).toContain("var b");

  // Ensure the remaining variables were not renamed
  expect(code).toContain("keepMyVar3");
  expect(code).toContain("keepMyVar4");
  expect(code).toContain("keepMyVar5");
});

test("Variant #16: Limit of not should rename any variables", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var renameMyVar1 = 1;
    var renameMyVar2 = 2;
    `,
    {
      target: "node",
      renameVariables: {
        value: true,
        limit: 0,
      },
      identifierGenerator: "mangled",
    }
  );

  // Ensure the variable names were preserved
  expect(code).toContain("renameMyVar1");
  expect(code).toContain("renameMyVar2");

  expect(code).not.toContain("var a");
  expect(code).not.toContain("var b");
});

test("Variant #17: Limit of -1 should rename all variables", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var renameMyVar1 = 1;
    var renameMyVar2 = 2;
    `,
    {
      target: "node",
      renameVariables: {
        value: true,
        limit: -1,
      },
      identifierGenerator: "mangled",
    }
  );

  // Ensure both variables were renamed
  expect(code).not.toContain("renameMyVar1");
  expect(code).not.toContain("renameMyVar2");

  expect(code).toContain("var a");
  expect(code).toContain("var b");
});

test("Variant #18: Customize default lock limit", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    // Program

    var a,b,c;

    { // Block 1
      var d,e,f;
    }

    { // Block 2
      var g,h,i; 
    }

    { // Block 3
      var j,k,l;
    }

    TEST_OUTPUT = typeof a === "undefined";
    `,
    {
      target: "node",
      lock: {
        selfDefending: true,
        defaultMaxCount: 1, // Place only one lock
      },
    }
  );

  // Must contain only one self-defending lock
  expect(code).toContain("var namedFunction");
  expect(code.split("var namedFunction").length).toStrictEqual(2);

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(true);
});
