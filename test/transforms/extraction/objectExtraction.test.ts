import JsConfuser from "../../../src/index";

test("Variant #1: Extract properties", async () => {
  var code = `
    var TEST_OBJECT = {
      TEST_1: "Hello World",
      'TEST_2': 64
    }
    
    // ensures the original object is no longer defined
    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);

    input(TEST_OBJECT.TEST_1, TEST_OBJECT['TEST_2'], check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  // console.log(output);

  function input(a, b, c) {
    expect(a).toStrictEqual("Hello World");
    expect(b).toStrictEqual(64);
    expect(c).toStrictEqual(true);
  }

  eval(output);
});

test("Variant #2: Extract function properties correctly", async () => {
  var code = `
    var TEST_OBJECT = {
      isBoolean: x=>typeof x === "boolean",
      isString: function(x){return typeof x === "string"}
    }
    
    // ensures the original object is no longer defined
    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);

    input(TEST_OBJECT.isBoolean(true), TEST_OBJECT.isString(false), check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  // console.log(output);

  function input(a, b, c) {
    expect(a).toStrictEqual(true);
    expect(b).toStrictEqual(false);
    expect(c).toStrictEqual(true);
  }

  eval(output);
});

test("Variant #3: Not extract properties on with dynamically added keys", async () => {
  var code = `
    var TEST_OBJECT = {
      first_key: 1
    };

    TEST_OBJECT['DYNAMIC_PROPERTY'] = 1;
    TEST_OBJECT.DYNAMIC_PROPERTY = 1;


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #4: Not extract properties on with dynamically added keys even when in nested contexts", async () => {
  var code = `
    var TEST_OBJECT = {
      first_key: 1
    };

    (function(){
      TEST_OBJECT['DYNAMIC_PROPERTY'] = 1;
      TEST_OBJECT.DYNAMIC_PROPERTY = 1;
    })()
  


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #5: Not extract properties on objects with computed properties", async () => {
  var code = `
    
    var key = "111"
    var TEST_OBJECT = {
      [key]: 111,
    };


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #6: Not extract properties on objects with computed properties (string)", async () => {
  var code = `
    
    var v = "key";
    var TEST_OBJECT = {
      [v + ""]: 111,
    };


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #7: Not extract properties on objects when the object is referenced independently", async () => {
  var code = `
    
    var TEST_OBJECT = {
      isString: x=>typeof x === "string"
    };

    TEST_OBJECT;


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #8: Not extract properties on objects when the variable gets redefined", async () => {
  var code = `
    
    var TEST_OBJECT = {
      key: "value"
    };
    var TEST_OBJECT = {x: 1};


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #9: Not extract properties on objects when the variable gets reassigned", async () => {
  var code = `
    
    var TEST_OBJECT = {
      key: "value"
    };

    TEST_OBJECT = {key: "value_2"}


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #10: Not extract properties on objects with methods referencing 'this'", async () => {
  var code = `
    var TEST_OBJECT = {
      key: "value",
      getKey: function(){
        return this.key;
      }
    };


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #11: Not extract properties on objects when properties are dynamically deleted", async () => {
  var code = `
    
    var TEST_OBJECT = {
      key: "value"
    };

    delete TEST_OBJECT.key;

    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #12: Not extract properties on objects with computed accessors", async () => {
  var code = `
    
    var TEST_OBJECT = {
      key: "value"
    };

    TEST_OBJECT["k" + "e" + "y"];


    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #13: Properly use custom callback to exclude certain names from being changed", async () => {
  var code = `
    
    var TEST_OBJECT = {
      key: "value",
    };

    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var seen = new Set();
  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    objectExtraction: (name) => {
      seen.add(name);

      return name !== "TEST_OBJECT";
    },
  });

  expect(seen.has("TEST_OBJECT")).toStrictEqual(true);

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});

test("Variant #14: Not apply to objects with non-init properties (method, set, get)", async () => {
  var code = `
    
    var realValue = 0;
    var TEST_OBJECT = {
      set key(newValue){
        realValue = newValue;
      },
      get key(){
        return realValue;
      }
    };
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    objectExtraction: true,
  });

  expect(output).toContain("TEST_OBJECT");
  expect(output).toContain("set[");
});

// https://github.com/MichaelXF/js-confuser/issues/78
test("Variant #15: Handle objects with spread elements", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    var x = { firstName: "John", lastName: "Doe" }
    var y = { ...x };

    TEST_OUTPUT = y;
`,
    {
      target: "node",
      objectExtraction: true,
    }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual({ firstName: "John", lastName: "Doe" });
});

// https://github.com/MichaelXF/js-confuser/issues/106
test("Variant #16: Handle const declarations", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    const obj = {prop: 0};
    obj.prop = 1;
    TEST_OUTPUT = obj.prop;
`,
    {
      target: "node",
      objectExtraction: true,
    }
  );

  expect(output).toContain("let");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

test("Variant #17: Extract properties on objects in functions", async () => {
  var namesCollected: string[] = [];

  var { code } = await JsConfuser.obfuscate(
    `
    function getUserName(){
      var firstName = "John";
      var lastName = "Doe";

      var user = { firstName, lastName };

      return user.firstName + " " + user.lastName;
    }
      
    TEST_OUTPUT = getUserName();
    `,
    {
      target: "node",
      objectExtraction: (name) => {
        namesCollected.push(name);
        return true;
      },
    }
  );

  // Ensure object was visited
  expect(namesCollected).toContain("user");

  // Ensure object was changed
  expect(code).toContain("user_firstName");

  // Make sure results are correct
  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("John Doe");
});
