import JsConfuser from "../../src/index";

it("should extract properties", async () => {
  var code = `
    var TEST_OBJECT = {
      TEST_1: "Hello World",
      'TEST_2': 64
    }
    
    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);

    input(TEST_OBJECT.TEST_1, TEST_OBJECT['TEST_2'], check);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(a, b, c) {
    expect(a).toStrictEqual("Hello World");
    expect(b).toStrictEqual(64);
    expect(c).toStrictEqual(true);
  }

  eval(output);
});

it("should not extract properties on illegal objects", async () => {
  var code = `
    var TEST_OBJECT = {
      
    };

    TEST_OBJECT['DYNAMIC_PROPERTY'] = 1;

    var check = false;
    eval(\`
      try {TEST_OBJECT} catch(e) {
        check = true;
      }
    \`);
    
    input(check);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    objectExtraction: true,
  });

  function input(x) {
    expect(x).toStrictEqual(false);
  }

  eval(output);
});
