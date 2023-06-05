import JsConfuser from "../../../src/index";

test("Variant #1: Obfuscate code and still execute in correct order", async () => {
  var code = `
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

    TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  // Ensure the output is the exact same
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #2: Obfuscate for loops", async () => {
  var code = `
    var array = [];

    for ( var i = 1; i <= 10; i++ ) {
      array.push(i);
    }

    TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  // Ensure the for statement got flattened
  expect(output).not.toContain("for");

  // Ensure the output is the exact same
  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #3: Obfuscate while loops", async () => {
  var code = `
    var array = [];
    var i = 1;

    while ( i <= 10 ) {
      array.push(i);
      i++
    }

    TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  // Ensure the output is the exact same
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #4: Work with break statements", async () => {
  var code = `

    var TEST_ARRAY = [];

    for ( var i =1; i < 50; i++ ) {
      if ( i == 11 ) {
        break;
      }
      TEST_ARRAY.push(i);
    }

    TEST_OUTPUT = TEST_ARRAY;
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("switch");
  expect(output).toContain("while");

  // Ensure the output is the exact same
  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #5: Don't obfuscate code with `let` (Lexically bound variables)", async () => {
  var code = `
    let array = [];

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

    TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening did NOT apply here
  expect(output).not.toContain("while");

  // Ensure the output is the exact same
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #6: Don't obfuscate code with `let` (Lexically bound variables)", async () => {
  var code = `
    var array=[];
    for ( let i =1; i <= 10; i++ ) {
      array.push(i);
    }

    TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening did NOT apply here
  expect(output).not.toContain("while");

  // Ensure the output is the exact same
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #7: Allow option to be set a percentage threshold", async () => {
  var code = `
    var array = [];
    var i = 1;

    while ( i <= 10 ) {
      array.push(i);
      i++
    }

    TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: 0.5,
  });

  // Ensure the output is the exact same
  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #8: Work when obfuscated multiple times", async () => {
  var code = `
    var array = [];

    switch(true){
      case true: // Always true
        if(true){ // Always true
          var i;

          for ( i = 1; i <= 10; i++ ) {
            if(typeof i === "number") { // Always true
              array.push(i);

              var filler1;
              var filler2;
              var filler3;
            }

            var filler1;
            var filler2;
            var filler3;
          }

          var filler1;
          var filler2;
          var filler3;
        }

        var filler1;
        var filler2;
        var filler3;
      break;
    }
    
    TEST_OUTPUT = array;
  `; // [1,2,3,4,5,6,7,8,9,10]

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  var doublyObfuscated = await JsConfuser(output, {
    target: "node",
    controlFlowFlattening: true,
  });

  // Ensure the output is the exact same
  var TEST_OUTPUT;

  eval(doublyObfuscated);
  expect(TEST_OUTPUT).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #9: Don't entangle floats or NaN", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        
        var a = NaN;
        var b = 10.01;
        var c = 15.01;
        var d = "MyString";
        input(b + c)
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  expect(output).toContain("10.01");
  expect(output).toContain("15.01");
  expect(output).toContain("NaN");
  expect(output).toContain("MyString");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(25.02);
});

test("Variant #10: Correctly entangle property keys", async () => {
  var output = await JsConfuser(
    `
      function TEST_FUNCTION(){
        
        var obj = {
          10: 10,
          9: 9,
          8: 8,
          7: 7,
          6: 6,
          5: 5,
          4: 4,
          3: 3,
          2: 2,
          1: 1,
        }

        var ten = obj["5"] + obj["3"] + obj["2"];

        input(ten)
      }
      
      TEST_FUNCTION()
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);
  expect(value).toStrictEqual(10);
});

test("Variant #11: Flatten nested if statements", async () => {
  var output = await JsConfuser(
    `
    TEST_ARRAY = [];

    if(true){
      TEST_ARRAY.push(1);
    } else {
      TEST_ARRAY.push(-1);
    }

    if(true){
      TEST_ARRAY.push(2);
    }

    if(false){
      TEST_ARRAY.push(-1);
    }

    if(true){
      TEST_ARRAY.push(3);
      if(true){
        TEST_ARRAY.push(4);
      } else {
      TEST_ARRAY.push(-1);
      }
      TEST_ARRAY.push(5);
    }
    var fillerExpr1;
    var fillerExpr2;
    var fillerExpr3;
    var fillerExpr4;
    var fillerExpr5;
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  var TEST_ARRAY;

  eval(output);
  expect(TEST_ARRAY).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #12: Flatten nested for loops", async () => {
  var output = await JsConfuser(
    `
    TEST_ARRAY = [];

    for ( var i = -5; i < 0; i++ ) {
      var o = 0;
      for ( var j = 1; j < 4; j++ ) {
        o += j;
      }

      // o is 6
      TEST_ARRAY.push(i + o);
    }
    var fillerExpr1;
    var fillerExpr2;
    var fillerExpr3;
    var fillerExpr4;
    var fillerExpr5;
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  expect(output).not.toContain("for(var i)");
  expect(output).not.toContain("for(var j)");

  var TEST_ARRAY;

  eval(output);
  expect(TEST_ARRAY).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #13: Flatten nested while loops", async () => {
  var output = await JsConfuser(
    `
    TEST_ARRAY = [];

    var i = -5
    while ( i < 0 ) {
      var o = 0;
      var j = 1;

      while( j < 4 ){
        o += j;

        j++;
      }

      // o is 6
      TEST_ARRAY.push(i + o);
      i++;
    }
    var fillerExpr1;
    var fillerExpr2;
    var fillerExpr3;
    var fillerExpr4;
    var fillerExpr5;
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  var TEST_ARRAY;

  expect(output).not.toContain("while(i<0)");
  expect(output).not.toContain("while(j<4)");

  eval(output);
  expect(TEST_ARRAY).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #14: Flatten nested switch statements", async () => {
  var output = await JsConfuser(
    `
    TEST_ARRAY = [];
    
    var i = 0;
    switch(i){
      case 1: TEST_ARRAY.push(-1); break;
      case 2: TEST_ARRAY.push(-1); break;
      case 0:
        TEST_ARRAY.push(1);

        var j = 0;
        var i = 0;
        switch(j){
          case 1: TEST_ARRAY.push(-1); break;
          case 2: TEST_ARRAY.push(-1); break;
          case 0:
            TEST_ARRAY.push(2);
          break;
          case 4: TEST_ARRAY.push(-1); break;
          case 8: TEST_ARRAY.push(-1); break;
        } 

        TEST_ARRAY.push(3);

      break;
      case 4: TEST_ARRAY.push(-1); break;
      case 8: TEST_ARRAY.push(-1); break;
    } 

    TEST_ARRAY.push(4);
    TEST_ARRAY.push(5);
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  expect(output).not.toContain("switch(i");
  expect(output).not.toContain("switch(j");

  var TEST_ARRAY;

  eval(output);
  expect(TEST_ARRAY).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #16: Flatten with nested break and continue statements", async () => {
  var output = await JsConfuser(
    `
    TEST_ARRAY = [];

    for ( var i =1; i < 10; i++ ) {
      if(i%2==0){
        continue;
      }
      if(i==7){
        break;
      }
      TEST_ARRAY.push(i);
    }

    var j;

    a: for ( var i = 0; i < 5; i++ ) {
      if ( i == 3 ) {
        for ( j = 0; j < 5; j++ ) {
          if ( j == 1 ) {break a;}
          if ( j % 2 == 0 ) { continue a;}
        }
        TEST_ARRAY.push(-1);
      }
    }

    var fillerExpr1;
    var fillerExpr2;
    var fillerExpr3;
    var fillerExpr4;
    var fillerExpr5;
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  var TEST_ARRAY;

  eval(output);
  expect(TEST_ARRAY).toStrictEqual([1, 3, 5]);
});

test("Variant #17: Flatten with infinite for loop and break", async () => {
  var output = await JsConfuser(
    `
    TEST_ARRAY = [];
    var i = 1;

    for ( ;; ) {
      if (i == 6){break;}

      TEST_ARRAY.push(i), i++;
    }

    var fillerExpr1;
    var fillerExpr2;
    var fillerExpr3;
    var fillerExpr4;
    var fillerExpr5;
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  expect(output).not.toContain("for(;");

  var TEST_ARRAY;

  eval(output);
  expect(TEST_ARRAY).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #20: Work with redefined functions", async () => {
  var output = await JsConfuser(
    `
    var counter = 0;
    function increment(){
      counter++;

      if(counter == 3) {
        increment = () => { counter = "Correct Value" }
      }
    }

    increment(); // 1
    increment(); // 2
    increment(); // 3

    var originalIncrement = increment;
    increment = ()=>{};

    increment(); // 3
    increment(); // 3
    increment(); // 3

    increment = undefined;

    increment = typeof increment === "undefined" ? originalIncrement : 0;

    increment(); // "Correct Value"

    TEST_OUTPUT = counter; 
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  var TEST_OUTPUT;

  eval(output);
  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

// https://github.com/MichaelXF/js-confuser/issues/70
test("Variant #21: Don't move Import Declarations", async () => {
  var output = await JsConfuser(
    `
    import {createHash} from "crypto";
    var inputString = "Hash this string";
    var hashed = createHash("sha256").update(inputString).digest("hex");
    TEST_OUTPUT = hashed;
  `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  // Ensure Control Flow FLattening was applied
  expect(output).toContain("switch");

  // Ensure the import declaration wasn't moved
  expect(output.startsWith("import")).toStrictEqual(true);

  // Convert to runnable code
  output = output.replace(
    `import{createHash}from'crypto';`,
    "const {createHash}=require('crypto');"
  );

  var TEST_OUTPUT = "";

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(
    "1cac63f39fd68d8c531f27b807610fb3d50f0fc3f186995767fb6316e7200a3e"
  );
});

// https://github.com/MichaelXF/js-confuser/issues/81
test("Variant #22: Don't break typeof expression", async () => {
  var output = await JsConfuser(
    `
    TEST_OUTPUT = false;
    if(typeof nonExistentVariable === "undefined") {
      TEST_OUTPUT = true;
    }
    `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  var TEST_OUTPUT;

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #23: Don't break Super calls", async () => {
  var output = await JsConfuser(
    `
  class MyClass1 {
    constructor(val){
      this.val = val;
    }
  }
  class MyClass2 extends MyClass1 {
    constructor(){
      super(10);

      // Ensure ControlFlowFlattening applies here
      var filler1;
      var filler2;
      var filler3;
    }
  }

  var myObject = new MyClass2();
  TEST_OUTPUT = myObject.val; // 10
  `,
    { target: "node", controlFlowFlattening: true }
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #24: Nested function-calls with labeled breaks/continues", async () => {
  var code = `
  function myFunction(){
    function x( STOP_VALUE ){
      function y(){
        function dead(){
          var STOP_VALUE = 3;
        }
        function z(){
          a: for(var i = 0; i < 10; i++) {
            if (i == STOP_VALUE) {
              var counter = 0;
              b: for ( var j = 0; j < 10; j++ ) {
                if(j == 4) {
                  counter -= 50;
                  continue b;
                }
                counter++;
                if(j == 8) {
                  break a;
                }
              }
            }
          }

          var filler1;
          var filler2;
          var filler3;
          return i + j + counter;
        }

        var filler1;
        var filler2;
        var filler3;
        return z();
      }

      var filler1;
      var filler2;
      var filler3;
      return y();
    }

    var filler1;
    var filler2;
    var filler3;
    return x( 1 );
  }

  var x = myFunction();

  TEST_OUTPUT = x;`;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
    renameVariables: true,
    identifierGenerator: "mangled",
    stack: true,
  });

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(-33);
});

test("Variant #25: Don't break call expressions to bound functions", async () => {
  var code = `
  var array = [];
  array.push(1);
  array.push(2);
  array.push(3);
  array.push(4);
  array.push(5);

  TEST_OUTPUT = array;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #26: Add opaque predicates and still work", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT = [];
  if(true) TEST_OUTPUT.push(1);
  else TEST_OUTPUT.push("Incorrect If Statement")

  switch(true){
    case true: TEST_OUTPUT.push(2); break;
    default:
      TEST_OUTPUT.push("Incorrect Switch")
  }

  TEST_OUTPUT.push( true ? 3 : "Incorrect Conditional Statement" );
  `,
    { target: "node", controlFlowFlattening: true }
  );

  expect(output).toContain("while");
  var TEST_OUTPUT = [];

  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([1, 2, 3]);
});

test("Variant #27: Work on async/generator functions", async () => {
  var output = await JsConfuser(
    `
  "use strict";
  async function myAsyncFunction(){
    await (1);
  }

  function* myGeneratorFunction(){
    yield "Correct Value";
  }

  var x = myAsyncFunction();
  var generatorObject = myGeneratorFunction();

  TEST_OUTPUT = generatorObject.next().value;

  var fillerVar1;
  var fillerVar2;
  var fillerVar3;
  `,
    { target: "node", controlFlowFlattening: true }
  );

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #28: Don't break update expressions", async () => {
  var code = `
  var counter = 0;

  counter++; // 1
  counter++; // 2
  counter++; // 3
  counter++; // 4
  counter++; // 5
  counter++; // 6
  counter++; // 7
  counter++; // 8
  counter++; // 9
  counter++; // 10

  TEST_OUTPUT = counter;
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #29: Nested labeled break and continue statements with RGF enabled", async () => {
  var code = `
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

  var fillerVar1;
  var fillerVar2;
  var fillerVar3;
  
  TEST_OUTPUT = labeledBreaksAndContinues();
  `; // This complex code produces the value of 15

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
    rgf: true,
    renameVariables: true,
    identifierGenerator: "mangled",
  });

  // Run the code
  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(15);
});

test("Variant #30: Obfuscate switch statements", async () => {
  var output = await JsConfuser(
    `
  switch("DON'T CHANGE ME"){} // Empty switch for testing
  
  switch(true){
    case 0:
      TEST_OUTPUT = "Incorrect Value (1)";
      break

    case true:
      TEST_OUTPUT = "First Correct Value";
      break;

    case 1:
    case 2:
    case 3:
    case false:
      TEST_OUTPUT = "Incorrect Value (2)";
      break;
  };

  switch(TEST_OUTPUT){
    case true:
      TEST_OUTPUT = "Incorrect Value (3)";
      break;

    case false:
      TEST_OUTPUT = "Incorrect Value (4)";
      break;

    default:
      TEST_OUTPUT = "Second Correct Value";
  }

  switch(true){
    case false:
      throw new Error();
      break;

    default:
      TEST_OUTPUT = "Incorrect Value";

    case true:
      TEST_OUTPUT = "Third Correct Value";
      // Fall-through test
    case 10:
      TEST_OUTPUT = "Fourth Correct Value";

  }

  switch(true){
    default:
      throw new Error("NO");      
      break;
    case true:

      break;
  }

  var hitDefault = false;

  switch(true){
    case 1:
    case 2:

    default:
      hitDefault = true;
      break;

    case 3:
    case 4:
      break;
  }

  if(!hitDefault) {
    throw new Error("Did not hit default case");
  }

  var filler1;
  var filler2;
  var filler3;
  `,
    {
      target: "node",
      controlFlowFlattening: true,
    }
  );

  // Ensure Control Flow Flattening applied
  expect(output).toContain("while");

  // Ensure switch-statements got changed
  expect(output).not.toContain("switch(true)");
  expect(output).not.toContain("switch(TEST_OUTPUT)");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Fourth Correct Value");
});

test("Variant #31: Don't break nested function calls", async () => {
  var output = await JsConfuser(
    `
    var i;
    var counter = 0;
    for(i = 0; i < 10;) {
      function logger(x){
        counter++;
      }
  
      logger("Hello World");
      i++
    }

    TEST_OUTPUT = counter;
  `,
    { target: "node", controlFlowFlattening: true }
  );

  expect(output).toContain("while");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #32: Don't break same name function calls", async () => {
  var output = await JsConfuser(
    `
    var counter = 0;

    function a(){
      // Outer a called
      counter *= 2;
    }

    var i;

    for(i = 0; i < 10;) {
      function a(){
        // Inner a called
        counter += 1;
      }
 
      a(); // Inner a
      i++;
    }

    a(); // Inner a, Outer a got renamed

    TEST_OUTPUT = counter;
  `,
    { target: "node", controlFlowFlattening: true }
  );

  expect(output).toContain("while");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(11);
});

test("Variant #33: Don't break same name function declarations that are not ran", async () => {
  var output = await JsConfuser(
    `
    var counter = 0;

    function a(){
      // Outer a called
      counter += 1;
    }

    for(var i = 0; i < 10;) {
      if(false){
        function a(){
          // Inner a called
          counter = 0;
        }
      }
      
 
      a(); // Outer a
      i++;
    }

    a(); // Outer a

    TEST_OUTPUT = counter;
  `,
    { target: "node", controlFlowFlattening: true }
  );

  expect(output).toContain("while");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(11);
});

test("Variant #34: Flatten If, For, While, Do-while, and Switch statements multiple times", async () => {
  var code = `
  var counter = -1;

  function incrementCounter(){
    counter++;
  }

  if(false) {
    
  } else {
    counter = 0;
  }

  if(true){
    for(var i = 0; i < 10; i++) {
      switch(i){
        default:
          i++;
          break;

        case 6:
          if(false){
            function incrementCounter(){
              throw new Error("Fake counter function");
            }
          }

          while(i != 10) {
            incrementCounter();
            if(counter > 10) break;
          }

          do {
            counter--;
          } while (counter > 5)
          // Fall-through
        case 8:
          counter *= 2;
          break;
      }
    }
  } else {
    counter = "Incorrect Value";
  }
  if(false){
    counter = "Incorrect Value";
  }

  TEST_OUTPUT = counter;
  `;

  var firstObfuscation = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });
  var secondObfuscation = await JsConfuser(firstObfuscation, {
    target: "node",
    controlFlowFlattening: true,
  });

  var TEST_OUTPUT;
  eval(secondObfuscation);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #35: Redefined function declaration + variable declaration", async () => {
  var code = `
  function push(str){
    TEST_OUTPUT.push(str);
  }

  x();

  var x = ()=>push("Top x");

  x()

  function x(){ push("Bottom x") }

  if(true){

    x();

    function x(){ push("Nested x") }
  }
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  var TEST_OUTPUT = [];
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(["Bottom x", "Top x", "Nested x"]);
});
