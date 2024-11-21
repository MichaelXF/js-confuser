TEST_OUTPUT = {};

// Variant #1 Using `let`
let myVariable = 1;
TEST_OUTPUT["Variant #1"] = myVariable === 1;

// Variant #2 Destructing variable from object (ObjectPattern)
let { key } = { key: 2 };
TEST_OUTPUT["Variant #2"] = key === 2;

// Variant #3 Destructing variable and using differing output name (ObjectPattern)
let { key: customName } = { key: 3 };
TEST_OUTPUT["Variant #3"] = customName === 3;

// Variant #4 Destructing variable from array (ArrayPattern)
let [element] = [4];
TEST_OUTPUT["Variant #4"] = element === 4;

// Variant #5 Destructing computed property from nested pattern
let [{ ["key"]: deeplyNestedKey }] = [{ key: 5 }];
TEST_OUTPUT["Variant #5"] = deeplyNestedKey === 5;

// Variant #6 Make sure arrow functions work
const arrowFn = () => 6;
TEST_OUTPUT["Variant #6"] = arrowFn() === 6;

// Variant #7 Make sure inline methods on object work
let es6Object = {
  method() {
    return 7;
  },
};
TEST_OUTPUT["Variant #7"] = es6Object.method() === 7;

// Variant #8 Make sure getters on object work
es6Object = {
  get getter() {
    return 8;
  },
};
TEST_OUTPUT["Variant #8"] = es6Object.getter === 8;

// Variant #9 Make sure getters with computed properties work
let customKey = "myGetter";
es6Object = {
  get [customKey]() {
    return 9;
  },
};
TEST_OUTPUT["Variant #9"] = es6Object.myGetter === 9;

// Variant #10 Make sure constructor method works
var value;
class MyClass {
  constructor(x) {
    value = x;
  }
}

var myInstance = new MyClass(10);
TEST_OUTPUT["Variant #10"] = value === 10;

// Variant #11 Make sure for-loop initializers work
var sum = 0;
for (var x of [3, 3, 5]) {
  sum += x;
}
TEST_OUTPUT["Variant #11"] = sum === 11;

// Variant #12 More complex for-loop initializer
var outside = 12;
for (
  var myFunction = function () {
    return outside;
  };
  false;

) {}

var functionCall = myFunction();
TEST_OUTPUT["Variant #12"] = functionCall === 12;

function noLexicalVariables() {
  // Variant #13 For-in statement
  var object = { 100: true, "-87": true, 1000: false };
  var sumOfKeys = 0;
  for (var propertyName in object) {
    if (object[propertyName] === true) {
      sumOfKeys += parseInt(propertyName);
    }
  }

  TEST_OUTPUT["Variant #13"] = sumOfKeys === 13;

  // Variant #14 For-of statement
  var values = [10, 20, 30, 40, -86];
  var sumOfValues = 0;
  for (var value of values) {
    sumOfValues += value;
  }

  TEST_OUTPUT["Variant #14"] = sumOfValues === 14;
}

noLexicalVariables();

function useStrictFunction() {
  "use strict";

  function testThis() {
    // Ensure 'this' behaves like strict mode
    function fun() {
      return this;
    }

    TEST_OUTPUT["Variant #15"] = [
      fun() === undefined,
      fun.call(2) === 2,
      fun.apply(null) === null,
      fun.call(undefined) === undefined,
      fun.bind(true)() === true,
    ];
  }

  testThis();

  function testArguments() {
    // Ensure arguments behaves like strict-mode

    TEST_OUTPUT["Variant #16: #1"] = false;
    try {
      useStrictFunction.arguments;
    } catch (e) {
      TEST_OUTPUT["Variant #16: #1"] = true;
    }

    TEST_OUTPUT["Variant #16: #2"] = false;
    try {
      useStrictFunction.caller;
    } catch (e) {
      TEST_OUTPUT["Variant #16: #2"] = true;
    }

    TEST_OUTPUT["Variant #16: #3"] = false;
    try {
      arguments.callee;
    } catch (e) {
      TEST_OUTPUT["Variant #16: #3"] = true;
    }
  }

  testArguments();

  function testEval() {
    var __NO_JS_CONFUSER_RENAME__myOuterVariable = "Initial Value";

    // Eval will not leak names
    eval("var __NO_JS_CONFUSER_RENAME__myOuterVariable = 'Incorrect Value';");

    TEST_OUTPUT["Variant #17"] =
      __NO_JS_CONFUSER_RENAME__myOuterVariable === "Initial Value";
  }

  testEval();
}

useStrictFunction();

function labeledBreaksAndContinues() {
  var flag = true;

  label_1: for (var i = 0; i < 20; i++) {
    b: switch (i) {
      case 15:
        c: do {
          if (i !== 15) {
            break c;
          }
          flag = true;

          break label_1;

          var fillerVar1;
          var fillerVar2;
          var fillerVar3;
        } while (i == 15);

        break;

      case 10:
        continue label_1;

      default:
        flag = false;
        break b;
    }

    var fillerVar1;
    var fillerVar2;
    var fillerVar3;
  }

  var fillerVar1;
  var fillerVar2;
  var fillerVar3;

  if (flag) {
    return i;
  }
}

TEST_OUTPUT["Variant #18"] = labeledBreaksAndContinues() === 15;

// Variant #19: Function.length property
var variant19 = function (n1, n2, n3, n4, n5) {
  var _ = true;
};

TEST_OUTPUT["Variant #19"] = variant19.length === 5;

// Variant #20: Function name and parameter name collision
function fnName(fnName) {
  TEST_OUTPUT["Variant #20"] = fnName === "Correct Value";
}
fnName("Correct Value");

// Variant #21, #22: Default parameter function that accesses parameter scope
var _v__d = "Correct Value";
function variant21And22(
  _v__a,
  _v__b = function () {
    _v__a = "Correct Value";
  },
  _v__c = function () {
    return _v__d;
  }
) {
  var _v__d = "Incorrect Value";
  _v__b();
  TEST_OUTPUT["Variant #21"] = _v__a === "Correct Value";
  TEST_OUTPUT["Variant #22"] = _v__c() === "Correct Value";
}

variant21And22();

function countermeasures() {
  throw new Error("Countermeasures function called.");
}
