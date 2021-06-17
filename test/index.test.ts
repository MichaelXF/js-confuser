import JsConfuser from "../src/index";

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
