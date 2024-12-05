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

// Mocks eval() to run the code in on specific domain
function evalOnDomain(code, domainToTest) {
  var location = {
    href: domainToTest,
  };

  var window = { location };

  var TEST_OUTPUT = "Never Called";

  eval(code);

  return TEST_OUTPUT;
}

test("Variant #3: Should work with RegExp", async () => {
  var { code } = await JsConfuser.obfuscate(
    ` function countermeasures(){ TEST_OUTPUT = "Countermeasures Called"; } `,
    {
      target: "browser",
      lock: {
        domainLock: [/^https:\/\/mywebsite\.com/],
        countermeasures: "countermeasures",
      },
    }
  );

  expect(evalOnDomain(code, "https://mywebsite.com")).toStrictEqual(
    "Never Called"
  );
  expect(
    evalOnDomain(code, "https://mywebsite.com/my-about-page")
  ).toStrictEqual("Never Called");
  expect(evalOnDomain(code, "https://mysubdomain.mywebsite.com")).toStrictEqual(
    "Countermeasures Called"
  );
});

test("Variant #4: Should work with multiple Domain Locks", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function onTamperDetected(){
      TEST_OUTPUT = "Countermeasures Called"; 
    }
    `,
    {
      target: "browser",
      lock: {
        domainLock: ["mywebsite.com", "anotherwebsite.com"],
        countermeasures: "onTamperDetected",
      },
    }
  );

  // Valid examples
  expect(evalOnDomain(code, "https://mywebsite.com")).toStrictEqual(
    "Never Called"
  );
  expect(evalOnDomain(code, "https://anotherwebsite.com")).toStrictEqual(
    "Never Called"
  );
  expect(
    evalOnDomain(code, "https://mysubdomain.anotherwebsite.com")
  ).toStrictEqual("Never Called");

  // Invalid examples
  expect(evalOnDomain(code, "https://my-website.com")).toStrictEqual(
    "Countermeasures Called"
  );
  expect(evalOnDomain(code, "https://imposterwebsite.com")).toStrictEqual(
    "Countermeasures Called"
  );
});
