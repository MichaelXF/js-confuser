"use strict";

function TestStrictMode() {
  "use strict";

  var isStrictMode = () => {
    try {
      undefined = true;
    } catch (E) {
      return true;
    }
    return false;
  };

  // filler code to make transformations more likely to affect this function
  var x, y, z;
  var string1 = "Hello World";
  var string2 = "use strict";

  var chars = string2.split("");
  var count = 0;
  for (var char of chars) {
    count++;
  }

  expect(count).toStrictEqual(10);

  // This function should be in strict mode
  expect(isStrictMode()).toStrictEqual(true);
}

var isStrictMode = () => {
  try {
    undefined = true;
  } catch (E) {
    return true;
  }
  return false;
};

// Global level should be in strict mode
expect(isStrictMode()).toStrictEqual(true);
TestStrictMode();

// Direct vs. Indirect eval usage
var evalString = `
var isStrictMode = () => {
  try {
    undefined = true;
  } catch (E) {
    return true;
  }
  return false;
};

isStrictMode();`;

// Direct eval -> Preserve global strict-mode
var directEvalResult = eval(evalString);
expect(directEvalResult).toStrictEqual(true);

// Indirect eval -> Does not inherit context strict-mode
var _eval_ = eval;
var indirectEvalResult = _eval_(evalString);
expect(indirectEvalResult).toStrictEqual(false);
