import JsConfuser from "../../../src/index";

it("add debugger statements", async () => {
  var output = await JsConfuser.obfuscate("input(true)", {
    target: "node",
    lock: {
      antiDebug: true,
    },
  });

  expect(output).toContain("debugger");
});

it("add a background interval", async () => {
  var output = await JsConfuser.obfuscate("input(true)", {
    target: "node",
    lock: {
      antiDebug: true,
    },
  });

  expect(output).toContain("setInterval");
});
