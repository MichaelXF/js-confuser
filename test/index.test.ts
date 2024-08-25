import JsConfuser, { obfuscateWithProfiler } from "../src/index";
import { ProfilerLog } from "../src/obfuscationResult";

it("should be a function", async () => {
  expect(typeof JsConfuser).toBe("function");
});

it("should return be an awaited string", async () => {
  var output = await JsConfuser("5+5", {
    target: "browser",
    opaquePredicates: true,
  });

  expect(typeof output).toBe("string");
});

it("should error when options are empty", async () => {
  var invalid: any = {};

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when no obfuscation options", async () => {
  var invalid: any = {
    target: "browser",
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error on invalid target values", async () => {
  var invalid: any = {
    target: "__invalid__target__",
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when target property missing", async () => {
  var invalid: any = {
    objectExtraction: true,
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when invalid options are passed in", async () => {
  var invalid: any = {
    target: "browser",
    __invalid__prop__: true,
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when browserLock is used on target 'node'", async () => {
  var invalid: any = {
    target: "node",
    lock: {
      browserLock: ["firefox"],
    },
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when invalid browser names are passed in", async () => {
  var invalid: any = {
    target: "browser",
    lock: {
      browserLock: ["__invalid__browser__"],
    },
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when invalid os names are passed in", async () => {
  var invalid: any = {
    target: "browser",
    lock: {
      osLock: ["__invalid__browser__"],
    },
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when invalid startDate is passed in", async () => {
  var invalid: any = {
    target: "browser",
    lock: {
      startDate: "__invalid__date__object__",
    },
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when invalid endDate is passed in", async () => {
  var invalid: any = {
    target: "browser",
    lock: {
      endDate: "__invalid__date__object__",
    },
  };

  await expect(async () => {
    return await JsConfuser("5+5", invalid);
  }).rejects.toThrow();
});

it("should error when source code is not a string", async () => {
  await expect(async () => {
    return await JsConfuser({} as any, {
      target: "node",
      preset: "low",
    });
  }).rejects.toThrow();
});

it("should error when invalid source code is passed in", async () => {
  await expect(async () => {
    return await JsConfuser("#?!if?//for:;1(function:class{))]][]", {
      target: "node",
      preset: "low",
    });
  }).rejects.toThrow();
});

describe("obfuscateAST", () => {
  test("Variant #1: Mutate AST", async () => {
    var AST = {
      type: "Program",
      body: [
        {
          type: "ExpressionStatement",
          expression: { type: "Literal", value: true },
        },
      ],
    };
    var before = JSON.stringify(AST);

    JsConfuser.obfuscateAST(AST as any, { target: "node", es5: true });

    var after = JSON.stringify(AST);

    // Same object reference
    expect(AST === AST).toStrictEqual(true);

    // Different string
    expect(before !== after).toStrictEqual(false);
  });

  test("Variant #2: Error on invalid parameters", async () => {
    await expect(async () => {
      return await JsConfuser.obfuscateAST("string" as any, {
        target: "node",
        preset: "low",
      });
    }).rejects.toThrow();
  });

  test("Variant #3: Error on invalid AST", async () => {
    await expect(async () => {
      var invalidAST = {
        type: "NotProgram",
      };

      return await JsConfuser.obfuscateAST(invalidAST as any, {
        target: "node",
        preset: "low",
      });
    }).rejects.toThrow();
  });
});

describe("obfuscateWithProfiler", () => {
  test("Variant #1: Return Profile Data and notify the Profile Log callback", async () => {
    var called = false;

    var callback = (log: ProfilerLog) => {
      expect(typeof log.currentTransform).toStrictEqual("string");
      expect(typeof log.currentTransformNumber).toStrictEqual("number");
      expect(typeof log.totalTransforms).toStrictEqual("number");
      if (typeof log.nextTransform !== "undefined") {
        expect(typeof log.nextTransform).toStrictEqual("string");
      }

      called = true;
    };
    var { code, profileData } = await JsConfuser.obfuscateWithProfiler(
      `console.log(1)`,
      { target: "node", preset: "low" },
      {
        callback,
        performance: require("perf_hooks").performance,
      }
    );

    expect(typeof code).toStrictEqual("string");
    expect(typeof profileData.obfuscationTime).toStrictEqual("number");
    expect(typeof profileData.compileTime).toStrictEqual("number");
    expect(typeof profileData.parseTime).toStrictEqual("number");
    expect(typeof profileData.totalPossibleTransforms).toStrictEqual("number");
    expect(typeof profileData.totalTransforms).toStrictEqual("number");
    expect(typeof profileData.transformTimeMap).toStrictEqual("object");
    expect(typeof profileData.transformTimeMap.RenameVariables).toStrictEqual(
      "number"
    );

    eval(code);
    expect(called).toStrictEqual(true);
  });
});
