import JsConfuser from "../../../src/index";

var _eval = eval;

function evalInNonStrictMode(str: string) {
  var TEST_OUTPUT;

  function TEST_OUTPUT_SET(value) {
    TEST_OUTPUT = value;
  }

  try {
    // 'new Function' runs in non-strict mode
    // The original 'eval' function is passed in each test
    // This is because once 'eval' is changed, it is changed for all new Function() calls!
    var fn = new Function("TEST_OUTPUT_SET", "eval", str);

    fn(TEST_OUTPUT_SET, _eval);
  } catch (err) {
    return { error: err, TEST_OUTPUT: TEST_OUTPUT };
  }

  return { error: null, TEST_OUTPUT: TEST_OUTPUT };
}

describe("Global Concealing", () => {
  test("Variant #1: Detect Eval tamper (no tamper)", async () => {
    var code = `
    global.TEST_GLOBAL_OUTPUT = global.TEST_GLOBAL;
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

    evalInNonStrictMode(output);

    // Make reuse global variable as 'new Function' runs in isolated environment
    var TEST_OUTPUT = (global as any).TEST_GLOBAL_OUTPUT;

    expect(TEST_OUTPUT).toStrictEqual(TEST_GLOBAL);
  });

  test("Variant #2: Detect Eval tamper (tampered)", async () => {
    var code = `
    function onTamperDetected(){
      TEST_OUTPUT_SET(true);
    }
    global.TEST_GLOBAL_VARIANT_7_OUTPUT = global.TEST_GLOBAL_VARIANT_7;
    `;

    var output = await JsConfuser(code, {
      target: "node",
      globalConcealing: (varName) => varName != "TEST_OUTPUT_SET",
      lock: {
        tamperProtection: true,
        countermeasures: "onTamperDetected",
      },
    });

    // Inject 'eval' tamper code
    output =
      `var _eval = eval;
       eval = (codeStr)=>( console.log(codeStr), _eval(codeStr) );
    ` + output;

    var TEST_GLOBAL_VARIANT_7 = {};
    (global as any).TEST_GLOBAL_VARIANT_7 = TEST_GLOBAL_VARIANT_7;

    var { error, TEST_OUTPUT } = evalInNonStrictMode(output);

    expect(error).toBeNull();
    expect(TEST_OUTPUT).toStrictEqual(true);
  });

  test("Variant #3: Native check on functions", async () => {
    var mockConsoleLog = (...msgs) => {
      console.log(...msgs);
    };
    mockConsoleLog.toString = () => "{ [native code] }";
    (global as any).mockConsoleLog = mockConsoleLog;

    var output = await JsConfuser(
      `
      function onTamperDetected(){
        TEST_OUTPUT_SET(true);
      }
      mockConsoleLog("console.log was not tampered")
      `,
      {
        target: "node",
        globalConcealing: (varName) => varName != "TEST_OUTPUT_SET",
        lock: {
          tamperProtection: true,
          countermeasures: "onTamperDetected",
        },
      }
    );

    var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    (global as any).Object.getOwnPropertyDescriptor = () => undefined;

    var { TEST_OUTPUT, error } = evalInNonStrictMode(output);

    (global as any).Object.getOwnPropertyDescriptor = getOwnPropertyDescriptor;

    expect(TEST_OUTPUT).not.toStrictEqual(true);
    expect(error).toBeNull();
  });

  test("Variant #4: Native check on functions (tampered)", async () => {
    var mockConsoleLog = (...msgs) => {
      console.log(...msgs);
    };
    mockConsoleLog.toString = () => "[native code]";
    (global as any).mockConsoleLog = mockConsoleLog;

    var output = await JsConfuser(
      `
      function onTamperDetected(){
        TEST_OUTPUT_SET(true);
      }

      mockConsoleLog("console.log was not tampered")
      `,
      {
        target: "node",
        globalConcealing: (varName) => varName != "TEST_OUTPUT_SET",
        lock: {
          tamperProtection: true,
          countermeasures: "onTamperDetected",
        },
      }
    );

    (global as any).mockConsoleLog = (...str) =>
      console.log("Tampered console.log: ", ...str);

    // Unfortunately the program errors dude to console.log being tampered
    var { TEST_OUTPUT, error } = evalInNonStrictMode(output);

    expect(TEST_OUTPUT).toStrictEqual(true);

    // Ensure error was thrown
    expect(error).not.toBeNull();
  });

  test("Variant #5: Native check on non-existent functions", async () => {
    var output = await JsConfuser(
      `
      a.b.c.d()
      `,
      {
        target: "node",
        globalConcealing: true,
        lock: {
          tamperProtection: true,
        },
      }
    );
  });

  test("Variant #7: Protect native function Math.floor", async () => {
    var output = await JsConfuser(
      `
      TEST_OUTPUT_SET(Math.floor(10.1));
      `,
      {
        target: "node",
        globalConcealing: (varName) => varName != "TEST_OUTPUT_SET",
        lock: {
          tamperProtection: true,
        },
      }
    );

    expect(output).not.toContain("Math['floor");

    var { TEST_OUTPUT, error } = evalInNonStrictMode(output);

    expect(error).toBeNull();
    expect(TEST_OUTPUT).toStrictEqual(10);
  });
});
