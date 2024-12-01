import JsConfuser from "../../../src";
import Obfuscator from "../../../src/obfuscator";
import { Order } from "../../../src/order";

test("Variant #1: Error if lock options is not an object", async () => {
  expect(async () => {
    var invalidLockOptions = true as any;

    await JsConfuser.obfuscate('console.log("Hello World")', {
      target: "node",
      lock: invalidLockOptions,
    });
  }).rejects.toThrow();
});

test("Variant #2: Lock transform should be skipped when no options are provided", async () => {
  var obfuscator = new Obfuscator({
    target: "node",
    lock: {},
  });

  var plugin = obfuscator.getPlugin(Order.Lock);

  expect(plugin).toBeUndefined();
});
