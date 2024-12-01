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

  TEST_OUTPUT.count = count;
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
TEST_OUTPUT.globalStrictMode = isStrictMode();
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
TEST_OUTPUT.directEvalResult = directEvalResult;

// Indirect eval -> Does not inherit context strict-mode
var _eval_ = eval;
var indirectEvalResult = _eval_(evalString);
TEST_OUTPUT.indirectEvalResult = indirectEvalResult;
