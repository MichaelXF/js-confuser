import JsConfuser from "../../../src/index";

describe("Global Concealing", () => {
  test("Variant #1: Detect Eval tamper (no tamper)", async () => {
    var code = `
    global.TEST_OUTPUT = global.TEST_GLOBAL;
    `;

    var output = await JsConfuser(code, {
      target: "node",
      globalConcealing: true,
      lock: {
        tamperProtection: true,
      },
    });

    var TEST_GLOBAL = {};
    (global as any).TEST_GLOBAL = TEST_GLOBAL;

    // 'new Function' runs in non-strict mode
    new Function(output)();

    // Make reuse global variable as 'new Function' runs in isolated environment
    var TEST_OUTPUT = (global as any).TEST_OUTPUT;

    expect(TEST_OUTPUT).toStrictEqual(TEST_GLOBAL);
  });

  test("Variant #2: Detect Eval tamper (tampered)", async () => {
    var code = `
    global.TEST_GLOBAL_VARIANT_7_OUTPUT = global.TEST_GLOBAL_VARIANT_7;
    `;

    var output = await JsConfuser(code, {
      target: "node",
      globalConcealing: true,
      lock: {
        tamperProtection: true,
      },
    });

    // Inject 'eval' tamper code
    output =
      `var _eval = eval;
    eval = (codeStr)=>( console.log(codeStr), _eval(codeStr) );
    ` + output;

    var TEST_GLOBAL_VARIANT_7 = {};
    (global as any).TEST_GLOBAL_VARIANT_7 = TEST_GLOBAL_VARIANT_7;
    var didError;

    try {
      // 'new Function' runs in non-strict mode
      new Function(output)();
    } catch (e) {
      didError = true;
    }

    expect(didError).toStrictEqual(true);

    // Ensure global variable was not affected
    var TEST_OUTPUT = (global as any).TEST_GLOBAL_VARIANT_7_OUTPUT;
    expect(TEST_OUTPUT).not.toStrictEqual(TEST_GLOBAL_VARIANT_7);
  });
});
