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
  test("Variant #1: Normal behavior when eval() is un-tampered", async () => {
    var code = `
    global.TEST_GLOBAL_OUTPUT = global.TEST_GLOBAL;
    `;

    var { code: output } = await JsConfuser.obfuscate(code, {
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

  test("Variant #2: Invoke countermeasures when eval() is tampered", async () => {
    var code = `
    function onTamperDetected(){
      TEST_OUTPUT_SET("Countermeasures Invoked");
    }

    function myFunction(){
      // Global Concealing finds native 'console.log'
      // Adds GetGlobal template
      // Detects 'eval' tamper
      // Calls 'onTamperDetected'
      console.log("This function is purposely never called.");
    }
    `;

    var { code: output } = await JsConfuser.obfuscate(code, {
      target: "node",
      globalConcealing: (varName) => varName != "TEST_OUTPUT_SET",
      lock: {
        tamperProtection: true,
        countermeasures: "onTamperDetected",
      },

      // Ensure Eval renaming works
      renameVariables: true,
    });

    // Inject 'eval' tamper code
    output =
      `var _originalEval = eval;
       var eval = (codeStr)=>( console.log("Eval Intercepted", codeStr), TEST_OUTPUT_SET(codeStr), _originalEval(codeStr) );
    ` + output;

    var { error, TEST_OUTPUT } = evalInNonStrictMode(output);

    expect(error).toBeNull();
    expect(TEST_OUTPUT).toStrictEqual("Countermeasures Invoked");
  });

  test("Variant #3: Normal behavior when a native function is un-tampered", async () => {
    var mockConsoleLog = (...msgs) => {
      console.log(...msgs);
    };
    mockConsoleLog.toString = () => "{ [native code] }";
    (global as any).mockConsoleLog = mockConsoleLog;

    var { code: output } = await JsConfuser.obfuscate(
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

  test("Variant #4: Invoke countermeasures when a native function is tampered", async () => {
    var mockInvoked = false;

    var mockConsoleLog = (...msgs) => {
      console.log(...msgs);

      // Not good, the function was tampered
      mockInvoked = true;
    };
    (global as any).mockConsoleLog = mockConsoleLog;

    var { code: output } = await JsConfuser.obfuscate(
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
          tamperProtection: (fnName) => fnName === "mockConsoleLog",
          countermeasures: "onTamperDetected",
        },
      }
    );

    // Unfortunately the program errors dude to console.log being tampered
    var { TEST_OUTPUT, error } = evalInNonStrictMode(output);

    // Ensure mockConsoleLog was not called
    expect(mockInvoked).toStrictEqual(false);

    // Ensure countermeasures was called
    expect(TEST_OUTPUT).toStrictEqual(true);

    // Ensure error was thrown
    expect(error).not.toBeNull();
  });

  test("Variant #5: Native check on non-existent functions", async () => {
    var { code: output } = await JsConfuser.obfuscate(
      `
      a.b.c.d()
      nonExistentFunction()
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

  test("Variant #6: Custom implementation for lock.tamperProtection", async () => {
    var foundNames: string[] = [];
    var { code: output } = await JsConfuser.obfuscate(
      `
      fetch()
      console.log()
      shouldBeFound()
      console["trace"]()
      var NotFound = "NotFound"
      console[NotFound]()

      toString()

      var shouldNotBeFound;

      shouldNotBeFound()
      `,
      {
        target: "node",
        globalConcealing: true,
        lock: {
          tamperProtection: (fnName) => {
            foundNames.push(fnName);

            return false;
          },
        },
      }
    );

    expect(foundNames).toContain("fetch");
    expect(foundNames).toContain("console.log");
    expect(foundNames).toContain("shouldBeFound");
    expect(foundNames).toContain("console.trace");
    expect(foundNames).toContain("toString");

    expect(foundNames.join("")).not.toContain("NotFound");

    expect(foundNames).not.toContain("shouldNotBeFound");
  });

  test("Variant #7: Protect native function Math.floor", async () => {
    var { code: output } = await JsConfuser.obfuscate(
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

describe("RGF", () => {
  test("Variant #1: Detect Eval tamper (no tamper)", async () => {
    var { code: output } = await JsConfuser.obfuscate(
      `
      function countermeasures(){
        throw new Error("Countermeasures function should not be called");
      }
      function myFunction1(){
        TEST_OUTPUT_SET(true);
      }

      myFunction1();
      `,
      {
        target: "node",
        rgf: true,
        lock: {
          tamperProtection: true,
          countermeasures: "countermeasures",
        },

        // Ensure renaming countermeasures works
        renameVariables: true,

        // Allow RGF to transform 'myFunction1'
        // Otherwise, RGF will skip 'myFunction1' as 'TEST_OUTPUT_SET' is an outside variable
        globalVariables: new Set(["TEST_OUTPUT_SET"]),
      }
    );

    // Ensure 'myFunction1' was transformed
    expect(output).not.toContain(
      "function myFunction1(){TEST_OUTPUT_SET(true)"
    );
    expect(output).toContain("eval");

    var { TEST_OUTPUT, error } = evalInNonStrictMode(output);

    expect(error).toBeNull();
    expect(TEST_OUTPUT).toStrictEqual(true);
  });

  test("Variant #2: Invoke countermeasures when eval() is tampered", async () => {
    var { code: output } = await JsConfuser.obfuscate(
      `
      function onTamperDetected(){
        TEST_OUTPUT_SET("Correct Value");
      }
      function myFunction1(){
        TEST_OUTPUT_SET("Function still called");
      }

      myFunction1();
      `,
      {
        target: "node",
        rgf: true,
        lock: {
          tamperProtection: true,
          countermeasures: "onTamperDetected",
        },

        // Ensure Eval renaming works
        renameVariables: true,

        // Allow RGF to transform 'myFunction1'
        // Otherwise, RGF will skip 'myFunction1' as 'TEST_OUTPUT_SET' is an outside variable
        globalVariables: new Set(["TEST_OUTPUT_SET"]),
      }
    );

    expect(output).not.toContain("function myFunction1(){TEST_OUTPUT_SET(");
    expect(output).toContain("eval");

    // Inject 'eval' tamper code
    output =
      `var _originalEval = eval;
       var eval = (code)=>( TEST_OUTPUT_SET(code), console.log("Eval Intercepted", code), _originalEval(code) );` +
      output;

    var { TEST_OUTPUT, error } = evalInNonStrictMode(output);

    expect(TEST_OUTPUT).toStrictEqual("Correct Value");
    expect(error).toBeTruthy(); // An error occurs because the RGF array was not initialized
  });
});

describe("Strict Mode", () => {
  test("Variant #1: Error when 'use strict' directive is present", async () => {
    expect(() =>
      JsConfuser.obfuscate(
        `
      "use strict"; // Note: Jest testing environment is already in Strict Mode
      function onTamperDetected(){
        TEST_OUTPUT = true;
      }
      `,
        {
          target: "node",
          lock: {
            tamperProtection: true,
            countermeasures: "onTamperDetected",
          },
        }
      )
    ).rejects.toThrow(
      "Tamper Protection cannot be applied to code in strict mode."
    );
  });

  test("Variant #2: Invoke countermeasures when script is executing in strict-mode", async () => {
    var { code } = await JsConfuser.obfuscate(
      `
      function onTamperDetected(){
        TEST_OUTPUT = true;
      }
      `,
      {
        target: "node",
        lock: {
          tamperProtection: true,
          countermeasures: "onTamperDetected",
        },
      }
    );

    var TEST_OUTPUT;

    try {
      eval(code);
    } catch {}

    expect(TEST_OUTPUT).toStrictEqual(true);
  });
});
