import Obfuscator from "../src/obfuscator";

describe("globalState.lock.createCountermeasuresCode", () => {
  test("Variant #1: Error when lock is not enabled", () => {
    const obfuscator = new Obfuscator({ target: "node", compact: false });

    expect(() => {
      obfuscator.globalState.lock.createCountermeasuresCode();
    }).toThrow("Not implemented");
  });
});

describe("shouldTransformNativeFunction", () => {
  test("Variant #1: Return false when tamperProtection is not enabled", () => {
    const obfuscator = new Obfuscator({ target: "browser", compact: false });

    expect(obfuscator.shouldTransformNativeFunction(["fetch"])).toStrictEqual(
      false
    );
  });

  test("Variant #2: fetch() should be transformed", () => {
    const obfuscator = new Obfuscator({
      target: "browser",
      compact: false,
      lock: {
        tamperProtection: true,
      },
    });

    expect(obfuscator.shouldTransformNativeFunction(["fetch"])).toStrictEqual(
      true
    );
  });
});
