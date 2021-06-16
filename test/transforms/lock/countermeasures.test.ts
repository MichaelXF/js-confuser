import JsConfuser from "../../../src/index";

test("Variant #1: Error when countermeasures function can't be found", async () => {
  expect(async () => {
    await JsConfuser.obfuscate(`5+5`, {
      target: "node",
      lock: {
        countermeasures: "myMissingFunction",
      },
    });
  }).rejects.toThrow(
    "Countermeasures function named 'myMissingfunction' was not found"
  );
});

test("Variant #2: Error when countermeasures function isn't top-level", async () => {
  expect(async () => {
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
  expect(async () => {
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
