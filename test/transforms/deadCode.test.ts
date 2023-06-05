import JsConfuser from "../../src/index";

test("Variant #1: Execute properly", async () => {
  var code = `
    function myFunction(){
      var array = [];

      array.push(1);
      array.push(2);
      array.push(3);
      array.push(4);
      array.push(5);
      array.push(6);
      array.push(7);
      array.push(8);
      array.push(9);
      array.push(10);

      input(array);
    }

    myFunction();
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    deadCode: true,
  });

  // Ensure Dead code was added
  expect(output).toContain("if");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #2: Preserve 'use strict' directive", async () => {
  var code = `
    'use strict';
    function myFunction(){
      var array = [];

      array.push(1);
      array.push(2);
      array.push(3);
      array.push(4);
      array.push(5);
      array.push(6);
      array.push(7);
      array.push(8);
      array.push(9);
      array.push(10);

      input(array);
    }

    myFunction();
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    deadCode: true,
  });

  // Ensure 'use strict' was preversed
  expect(output.startsWith("'use strict'")).toStrictEqual(true);

  // Ensure Dead code was added
  expect(output).toContain("if");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
