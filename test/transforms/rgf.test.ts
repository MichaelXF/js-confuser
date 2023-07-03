import { writeFileSync } from "fs";
import JsConfuser from "../../src/index";

test("Variant #1: Convert Function Declaration into 'new Function' code", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function addTwoNumbers(a, b){
      return a + b;
    }
    
    TEST_OUTPUT = addTwoNumbers(10, 5);
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(15);
});

test("Variant #2: Convert Function Expression into 'new Function' code", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var addTwoNumbers = function(a, b){
      return a + b;
    }
    
    TEST_OUTPUT = addTwoNumbers(10, 5);
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(15);
});

test("Variant #3: Convert functions that use global variables", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function floorNumber(num){
      return Math.floor(num);
    }
    
    TEST_OUTPUT = floorNumber(1.9);
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

test("Variant #4: Don't convert functions that rely on outside-scoped variables", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var _Math = Math;

    function floorNumber(num){
      return _Math.floor(num);
    }
    
    TEST_OUTPUT = floorNumber(1.9);
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).not.toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

test("Variant #5: Don't convert functions that rely on outside-scoped variables (trap)", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var _Math = Math;

    function floorNumber(num){
      (()=>{
        var _Math;
      })();
      return _Math.floor(num);
    }
    
    TEST_OUTPUT = floorNumber(1.9);
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).not.toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

test("Variant #6: Work on High Preset", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function addTwoNumbers(a, b){
      return a + b;
    }
    
    TEST_OUTPUT = addTwoNumbers(10, 5);
    `,
    {
      target: "node",
      preset: "high",
      rgf: true,
    }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(15);
});

test("Variant #7: Don't convert arrow, async, or generator functions", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var arrowFunction = ()=>{};
    async function asyncFunction(){

    };
    function* generatorFunction(){
      yield "Correct Value";
    };

    TEST_OUTPUT = generatorFunction().next().value;
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).not.toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #8: Modified Function", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function addTwoNumbers(x,y){
      return x + y;
    }

    addTwoNumbers = function(){
      return "Incorrect Value";
    }

    addTwoNumbers = ()=>{
      return "Correct Value";
    }

    TEST_OUTPUT = addTwoNumbers(10, 5);
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #8: Modified Function (non function value)", async () => {
  var output = await JsConfuser.obfuscate(
    `
    function addTwoNumbers(x,y){
      return x+y;
    }

    addTwoNumbers = "Correct Value";

    TEST_OUTPUT = addTwoNumbers;
    `,
    {
      target: "node",
      rgf: true,
    }
  );

  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #9: Work with Flatten on any function", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var outsideCounter = 0;
    var outsideFlag = false;

    function incrementOutsideCounter(){
      outsideCounter++;
    }

    function incrementTimes(times){
      for( var i = 0; i < times; i++ ) {
        incrementOutsideCounter();
      }
      if( outsideFlag ) {
        TEST_OUTPUT = times === 1 && outsideCounter === 10 ? "Correct Value" : "Incorrect Value";
      } 
      outsideFlag = true;
    }

    incrementOutsideCounter();
    incrementTimes(8);
    incrementTimes(1); 
    `,
    {
      target: "node",
      rgf: true,
      flatten: true,
    }
  );

  expect(output).toContain("new Function");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #10: Configurable by custom function option", async () => {
  var functionNames: string[] = [];

  var output = await JsConfuser(
    `
  "use strict";

  // By checking strict-mode, we can check if the function was RGF or not
  function rgfThisFunction(){
    var isStrictMode = () => {
      try {
        undefined = true;
      } catch (E) {
        return true;
      }
      return false;
    }

    return isStrictMode();
  }

  function doNotRgfThisFunction(){
    var isStrictMode = () => {
      try {
        undefined = true;
      } catch (E) {
        return true;
      }
      return false;
    }

    return isStrictMode();
  }

  TEST_OUTPUT_1 = rgfThisFunction();
  TEST_OUTPUT_2 = doNotRgfThisFunction();
  `,
    {
      target: "node",
      rgf: (name) => {
        functionNames.push(name);
        return name !== "doNotRgfThisFunction";
      },
    }
  );

  expect(functionNames).toStrictEqual([
    "rgfThisFunction",
    "doNotRgfThisFunction",
  ]);
  expect(output).toContain("new Function");

  var TEST_OUTPUT_1;
  var TEST_OUTPUT_2;

  eval(output);
  expect(TEST_OUTPUT_1).toStrictEqual(false);
  expect(TEST_OUTPUT_2).toStrictEqual(true);
});
