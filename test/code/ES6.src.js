"use strict";

// Variant #1 Using `let`
let myVariable = 1;

expect(myVariable).toStrictEqual(1);

// Variant #2 Destructing variable from object (ObjectPattern)
let { key } = { key: 2 };

expect(key).toStrictEqual(2);

// Variant #3 Destructing variable and using differing output name (ObjectPattern)
let { key: customName } = { key: 3 };

expect(customName).toStrictEqual(3);

// Variant #4 Destructing variable from array (ArrayPattern)
let [element] = [4];

expect(element).toStrictEqual(4);

// Variant #5 Destructing computed property from nested pattern
let [{ ["key"]: deeplyNestedKey }] = [{ key: 5 }];

expect(deeplyNestedKey).toStrictEqual(5);

// Variant #6 Make sure arrow functions work
const arrowFn = () => 6;

expect(arrowFn()).toStrictEqual(6);

// Variant #7 Make sure inline methods on object work
let es6Object = {
  method() {
    return 7;
  },
};

expect(es6Object.method()).toStrictEqual(7);

// Variant #8 Make sure getters on object work
es6Object = {
  get getter() {
    return 8;
  },
};

expect(es6Object.getter).toStrictEqual(8);

// Variant #9 Make sure getters with computed properties work
let customKey = "myGetter";
es6Object = {
  get [customKey]() {
    return 9;
  },
};

expect(es6Object.myGetter).toStrictEqual(9);

// Variant #10 Make sure constructor method works
var value;
class MyClass {
  constructor(x) {
    value = x;
  }
}

var myInstance = new MyClass(10);
expect(value).toStrictEqual(10);

// Variant #11 Make sure for-loop initializers work
var sum = 0;
for (var x of [3, 3, 5]) {
  sum += x;
}
expect(sum).toStrictEqual(11);

// Variant #12 More complex for-loop initializer
var outside = 12;
for (
  var myFunction = function () {
    return outside;
  };
  false;

) {}

var TEST_OUTPUT = myFunction();

expect(TEST_OUTPUT).toStrictEqual(12);

function noLexicalVariables() {
  // Variant #13 For-in statement
  var object = { 100: true, "-87": true, 1000: false };
  var sumOfKeys = 0;
  for (var propertyName in object) {
    if (object[propertyName] === true) {
      sumOfKeys += parseInt(propertyName);
    }
  }

  expect(sumOfKeys).toStrictEqual(13);

  // Variant #14 For-of statement
  var values = [10, 20, 30, 40, -86];
  var sumOfValues = 0;
  for (var value of values) {
    sumOfValues += value;
  }

  expect(sumOfValues).toStrictEqual(14);
}

noLexicalVariables();

function useStrictFunction() {
  "use strict";

  function testThis() {
    // Ensure 'this' behaves like strict mode
    function fun() {
      return this;
    }

    expect(fun() === undefined).toStrictEqual(true);
    expect(fun.call(2) === 2).toStrictEqual(true);
    expect(fun.apply(null) === null).toStrictEqual(true);
    expect(fun.call(undefined) === undefined).toStrictEqual(true);
    expect(fun.bind(true)() === true).toStrictEqual(true);
  }

  testThis();

  function testArguments() {
    // Ensure arguments behaves like strict-mode
    expect(() => useStrictFunction.arguments).toThrow();
    expect(() => useStrictFunction.caller).toThrow();
    expect(() => arguments.callee).toThrow();
  }

  testArguments();

  function testEval() {
    var __NO_JS_CONFUSER_RENAME__myOuterVariable = "Initial Value";

    // Eval will not leak names
    eval("var __NO_JS_CONFUSER_RENAME__myOuterVariable = 'Incorrect Value';");

    expect(__NO_JS_CONFUSER_RENAME__myOuterVariable).toStrictEqual(
      "Initial Value"
    );
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

var variant15 = labeledBreaksAndContinues();
expect(variant15).toStrictEqual(15);

// Variant #16: Function.length property
var variant16 = function (
  n1,
  n2,
  n3,
  n4,
  n5,
  n6,
  n7,
  n8,
  n9,
  n10,
  n11,
  n12,
  n13,
  n14,
  n15,
  n16
) {
  var _ = true;
};

expect(variant16.length).toStrictEqual(16);

// Set 'ranAllTest' to TRUE
ranAllTest = true;

function countermeasures() {
  throw new Error("Countermeasures function called.");
}
