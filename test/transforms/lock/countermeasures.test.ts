import JsConfuser from "../../../src/index";

test("Variant #1: Error when countermeasures function can't be found", async () => {
  var err;
  try {
    await JsConfuser.obfuscate(`5+5`, {
      target: "node",
      lock: {
        countermeasures: "myMissingFunction",
      },
    });
  } catch (_err) {
    err = _err;
  }

  expect(err).toBeTruthy();
  expect(err instanceof Error).toStrictEqual(true);
  expect(err.message).toContain(
    "Countermeasures function named 'myMissingFunction' was not found"
  );
});

test("Variant #2: Error when countermeasures function isn't top-level", async () => {
  await expect(async () => {
    await JsConfuser.obfuscate(
      `
    (function(){
      function myNonTopLevelFunction(){

      }
    })();
    `,
      {
        target: "node",
        lock: {
          countermeasures: "myNonTopLevelFunction",
        },
      }
    );
  }).rejects.toThrow(
    "Countermeasures function must be defined at the global level"
  );
});

test("Variant #3: Error when countermeasures function is redefined", async () => {
  await expect(async () => {
    await JsConfuser.obfuscate(
      `
    function myFunction(){

    }
    var myFunction = function(){

    }
    `,
      {
        target: "node",
        lock: {
          countermeasures: "myFunction",
        },
      }
    );
  }).rejects.toThrow(
    "Countermeasures function was already defined, it must have a unique name from the rest of your code"
  );
});

test("Variant #4: Should work when countermeasures is variable declaration", async () => {
  await JsConfuser.obfuscate(
    `
  var myFunction = function(){

  }
  `,
    {
      target: "node",
      lock: {
        countermeasures: "myFunction",
      },
    }
  );
});

// https://github.com/MichaelXF/js-confuser/issues/66
test("Variant #5: Should work with RGF enabled", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
  function myCountermeasuresFunction(){

  }

  TEST_OUTPUT = true;
  `,
    {
      target: "node",
      lock: {
        countermeasures: "myCountermeasuresFunction",
      },
      rgf: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #6: Disallow reassignments to the countermeasures function", async () => {
  const sourceCode = `
  function myCountermeasuresFunction(){

  }
  myCountermeasuresFunction = function(){
    console.log("This is not allowed");
  }
  `;

  expect(async () => {
    return JsConfuser.obfuscate(sourceCode, {
      target: "node",
      lock: {
        countermeasures: "myCountermeasuresFunction",
      },
    });
  }).rejects.toThrow("Countermeasures function cannot be reassigned");
});

test("Variant #7: Should work with external countermeasures function", async () => {
  var didFlag = false;
  var global = {
    myExternalCountermeasures: function () {
      didFlag = true;
      throw new Error("Countermeasures triggered");
    },
  };

  var { code } = await JsConfuser.obfuscate(
    `
  TEST_OUTPUT = "Code executed when countermeasures is triggered";
  `,
    {
      target: "node",
      lock: {
        startDate: Date.now() + 1000 * 60 * 60, // 1 hour in future
        countermeasures: "global.myExternalCountermeasures",
      },
    }
  );

  var TEST_OUTPUT = "Code did not run";
  var didError = false;

  try {
    eval(code);
  } catch (error) {
    didError = true;
    expect(error.message).toContain("Countermeasures triggered");
  }
  expect(didFlag).toStrictEqual(true);
  expect(didError).toStrictEqual(true);
  expect(TEST_OUTPUT).toStrictEqual("Code did not run");
});
