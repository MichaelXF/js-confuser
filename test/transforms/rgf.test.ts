import { writeFileSync } from "fs";
import JsConfuser from "../../src/index";

describe("RGF", () => {
  it("should contain `new Function` in the output and work", async () => {
    var output = await JsConfuser.obfuscate(
      `
      function add(a,b){
        return a + b;
      }
      
      input(add(10, 5))
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).toContain("new Function");
    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);
    expect(value).toStrictEqual(15);
  });

  it("should work with multiple functions", async () => {
    var output = await JsConfuser.obfuscate(
      `
      function add(a,b){
        return a + b;
      }
  
      function parse(str){
        return parseInt(str);
      }
      
      input(add(parse("20"), 5))
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).toContain("new Function");
    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);
    expect(value).toStrictEqual(25);
  });

  it("should not change functions that have references to parent scopes", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var parentScope = 0;
      function add(a,b){

        // reference to parent scope
        return a + parentScope;
      }
      
      input(add(10, 5))
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).not.toContain("new Function");
  });

  it("should not change functions that have mutate their parent scopes", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var parentScope = 0;
      function add(a,b){

        // modifies parent scope
        parentScope = 1;
        return a + b;
      }
      
      input(add(10, 5))
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).not.toContain("new Function");
  });

  it("should work with High Preset", async () => {
    var output = await JsConfuser.obfuscate(
      `
    function log2(){
      var inputFn = input;
      var inputString = "Hello World";
      inputFn(inputString)
    }
    log2()
    `,
      {
        target: "node",
        preset: "high",
        globalConcealing: false,
      }
    );

    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);

    expect(value).toStrictEqual("Hello World");
  });

  it("should work with hideInitializingCode enabled", async () => {
    var output = await JsConfuser.obfuscate(
      `
function abc(x, y){
  return x + y;
}

var result = abc(10, 50);
input(console.log, result) 
`,
      {
        target: "node",
        identifierGenerator: "randomized",
        hideInitializingCode: true,
        rgf: true,
        compact: false,
        renameVariables: true,
      }
    );

    var value = "never_called";
    function input(_, valueIn) {
      value = valueIn;
    }

    eval(output);
    expect(value).toStrictEqual(60);
  });

  // https://github.com/MichaelXF/js-confuser/issues/64
  it("should work on Arrow Functions", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var double = (num)=>num*2;
      TEST_VALUE = double(10);
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).toContain("new Function");

    var TEST_VALUE;

    eval(output);
    expect(TEST_VALUE).toStrictEqual(20);
  });

  it("should work on Function Expressions", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var double = function(num){
        return num * 2
      };
      TEST_VALUE = double(10);
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).toContain("new Function");

    var TEST_VALUE;

    eval(output);
    expect(TEST_VALUE).toStrictEqual(20);
  });

  it("should work on re-assigned functions", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var fn1 = ()=>{
        return "FN1";
      }
      var fn2 = ()=>{
        fn1 = ()=>{
          return "FN1 - Modified"
        }
      }
      fn2();
      TEST_VALUE = fn1();
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).toContain("new Function");

    var TEST_VALUE;

    eval(output);
    expect(TEST_VALUE).toStrictEqual("FN1 - Modified");
  });

  it("should work on re-assigned functions to non-function values", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var fn1 = ()=>{
        return "FN1";
      }
      var fn2 = ()=>{
        fn1 = undefined;
      }
      fn2();
      TEST_VALUE = typeof fn1;
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).toContain("new Function");

    var TEST_VALUE;

    eval(output);
    expect(TEST_VALUE).toStrictEqual("undefined");
  });

  it("should not apply to functions that reference their parent scope in the parameters", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var outsideVar = 0;
      function myFunction(insideVar = outsideVar){
      }
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).not.toContain("new Function");
  });

  it("should not apply to functions that reference their parent scope in previously defined names", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var outsideVar = 0;
      function myFunction(){
        (function (){
          var outsideVar;
        })();

        console.log(outsideVar);
      }
      `,
      {
        target: "node",
        rgf: true,
      }
    );

    expect(output).not.toContain("new Function");
  });

  it("should work with Control Flow Flattening and Duplicate Literals Removal enabled", async () => {
    var output = await JsConfuser.obfuscate(
      `
      var x = [1,1,1,1,1,1,1,1,1,1];

      function myFunction(){
        return 1;
      };

      input( myFunction() ); // 1
    `,
      {
        target: "node",
        controlFlowFlattening: true,
        duplicateLiteralsRemoval: true,
        rgf: true,
      }
    );

    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);

    expect(value).toStrictEqual(1);
  });
});

describe("RGF with the 'all' mode", () => {
  it("should contain `new Function` in the output and work", async () => {
    var output = await JsConfuser.obfuscate(
      `
      function add(a,b){
        return a + b;
      }
      
      input(add(10, 5))
      `,
      {
        target: "node",
        rgf: "all",
      }
    );

    expect(output).toContain("new Function");
    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);
    expect(value).toStrictEqual(15);
  });

  it("should work with multiple functions", async () => {
    var output = await JsConfuser.obfuscate(
      `
      function add(a,b){
        return a + b;
      }
  
      function parse(str){
        return parseInt(str);
      }
      
      input(add(parse("20"), 5))
      `,
      {
        target: "node",
        rgf: "all",
      }
    );

    expect(output).toContain("new Function");
    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);
    expect(value).toStrictEqual(25);
  });

  it("should work with multiple, deeply-nested, functions", async () => {
    var output = await JsConfuser.obfuscate(
      `
     
function getNumbers(){
  return [5, 10];
}

function multiply(x,y){
  return x*y;
}

function testFunction(){
  function add(x,y){
    return x+y;
  }

  function testInnerFunction(){
    var numbers = getNumbers();

    // 5*10 + 10 = 60
    return add(multiply(numbers[0], numbers[1]), numbers[1])
  }

  input( testInnerFunction() );
}

testFunction();
      `,
      {
        target: "node",
        rgf: "all",
      }
    );

    expect(output).toContain("new Function");
    var value = "never_called";
    function input(valueIn) {
      value = valueIn;
    }

    eval(output);
    expect(value).toStrictEqual(60);
  });
});
