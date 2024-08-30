import JsConfuser from "../../../src";

test("Variant #1: Don't call countermeasures when domainLock is correct", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    ` function countermeasures(){ input(true) } `,
    {
      target: "browser",
      lock: {
        domainLock: ["mywebsite.com"],
        countermeasures: "countermeasures",
      },
    }
  );

  var location = {
    href: "mywebsite.com",
  };

  var window = { location };

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual("never_called");
});

test("Variant #2: Call countermeasures when domain is different", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    ` function countermeasures(){ input(true) } `,
    {
      target: "browser",
      lock: {
        domainLock: ["mywebsite.com"],
        countermeasures: "countermeasures",
      },
    }
  );

  var location = {
    href: "anotherwebsite.com",
  };

  var window = { location };

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(true);
});
