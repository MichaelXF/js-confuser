import JsConfuser from "../../src/index";

test("Variant #1: Result in the same order", async () => {
  var code = `
    var TEST_ARRAY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    input(TEST_ARRAY);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    shuffle: true,
  });

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #2: Properly shuffle arrays within expressions", async () => {
  var code = `
    input([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    shuffle: true,
  });

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

// https://github.com/MichaelXF/js-confuser/issues/48
test("Variant #3: Properly apply to const variables", async () => {
  var code = `
      const TEST_ARRAY = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  
      input(TEST_ARRAY);
    `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    shuffle: true,
  });

  var value;
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

// https://github.com/MichaelXF/js-confuser/issues/53
test("Variant #4: Don't use common variable names like x", async () => {
  var code = `
      let x = -999;
      let a = [1, 2, 3, 4, 5, 6];

      VALUE = a;
    `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    shuffle: true,
  });

  var VALUE;
  eval(output);
  expect(VALUE).toEqual([1, 2, 3, 4, 5, 6]);
});

test("Variant #5: Don't apply to arrays with non-pure elements", async () => {
  var shuffleCalled = false;

  var { code } = await JsConfuser.obfuscate(
    `
    var counter = 0;
    function increment(by) {
      counter += by;
      return counter;
    }
    TEST_OUTPUT = [increment(1), increment(2), increment(3), increment(4)];
    `,
    {
      target: "node",
      shuffle: () => {
        shuffleCalled = true;
        return true;
      },
    }
  );

  expect(shuffleCalled).toStrictEqual(false);

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual([1, 3, 6, 10]);
});
