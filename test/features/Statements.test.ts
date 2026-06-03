import { obfuscate, evalCode } from "../test-utils";

test("Variant #1: Debugger Statement", async () => {
  const source = `
    function test() {
      window.myConsoleLog("Before debugger");
      debugger;
      window.myConsoleLog("After debugger");
      
      window.TEST_OUTPUT = "Test completed";
    }
    test();
  `;

  let { code } = await obfuscate(source);

  // ensure debugger was found
  expect(code).toContain("debugger");
  // monkey-patch debugger to track execution order
  code = code.replace(/debugger/g, "window.myDebugger()");

  const order = [];
  const myDebugger = () => {
    order.push("debugger");
  };

  const myConsoleLog = () => {
    order.push("console.log");
  };

  const TEST_OUTPUT = await evalCode(code, { myDebugger, myConsoleLog });

  // ensure execution order is correct
  expect(order).toEqual(["console.log", "debugger", "console.log"]);

  // ensure output is correct
  expect(TEST_OUTPUT).toBe("Test completed");
});
