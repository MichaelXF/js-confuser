import JsConfuser from "../../../src/index";
import { SourceTextModule, createContext } from "node:vm";

test("Variant #1: Move variable 'y' to top", async () => {
  var code = `
    var x = 10;
    var y = 15;
    TEST_VARIABLE = x + y;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain("var x=10,y;");
  expect(output).toContain("y=15");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(25);
});

test("Variant #2: Move variable 'y' and 'z' to top", async () => {
  var code = `
    var x = 10;
    var y = 15;
    var z = 5;
    TEST_VARIABLE = x + y + z;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain("var x=10,y,z;");
  expect(output).toContain("y=15");
  expect(output).toContain("z=5");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(30);
});

test("Variant #3: Don't move 'y' (destructuring)", async () => {
  var code = `
    var x = 10;
    var [y] = [15];
    TEST_VARIABLE = x + y;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain("var[y]=[15];");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(25);
});

test("Variant #4: Move 'y' (nested lexical scope)", async () => {
  var code = `
    var x = 10;
    var y = 15;

    (function(){
      y = 10;
    })();

    TEST_VARIABLE = x + y;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain("var x=10,y;");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(20);
});

test("Variant #5: Move 'y' (for statement initializer)", async () => {
  var code = `
    var x = 10;
    for ( var y = 0; y < 15; y++ ) {

    } // y ends as 15
    TEST_VARIABLE = x + y;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).not.toContain("var y=0;");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(25);
});

test("Variant #6: Move 'y' (for-in left-hand initializer)", async () => {
  var code = `
    var x = 10;
    for ( var y in [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15] ) {

    } // y ends as "15"
    TEST_VARIABLE = x + parseInt(y);
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).not.toContain("var y in");
  expect(output).toContain("y in");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(25);
});

test("Variant #7: Don't move const or let variables", async () => {
  var code = `
    var fillerExpr;

    let x = 10;
    const y = 15;

    TEST_VARIABLE = x + y;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain("let x=10");
  expect(output).toContain("const y=15");

  var TEST_VARIABLE;
  eval(output);

  expect(TEST_VARIABLE).toStrictEqual(25);
});

test("Variant #8: Work with 'use strict'", async () => {
  var code = `
  function myFunction(){
    'use strict';

    var x = 1;

    return this === undefined;
  }

  TEST_OUTPUT = myFunction();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  // Ensure movedDeclarations applied and 'use strict' is still first
  // 'x' can still be moved but we can't store the static value as a default value
  // Strict mode functions disallow non-simple parameters
  expect(output).toContain('function myFunction(x){"use strict";x=1;');

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #9: Defined variable without an initializer + CFF + Duplicate Literals Removal", async () => {
  var code = `
  var x;
  x = 1;
  var y;
  y = 2;
  TEST_OUTPUT = x + y;
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
    controlFlowFlattening: true,
    duplicateLiteralsRemoval: true,
    pack: true,
  });

  var TEST_OUTPUT;
  eval(output);
  expect(TEST_OUTPUT).toStrictEqual(3);
});

test("Variant #10: Move parameters to predictable function", async () => {
  var code = `
  function testFunction_FN(){
    var values = [10,20,35,"40", null]
    var parseIntKey = "parseInt"
    var output = 0
    var utils = {
      get parser(){
        var fn = (value)=>{
          return global[parseIntKey](value)
        }
        return fn
      },

      set setter_fn(newValue){
        var fakeVar
      }
    }
    
    class FakeClass {
      constructor(){
      }

      get fakeGet(){
        var fakeVar
      }
    }

    for(var value of values) {
      switch(value){
        case null:
          break;

        default:
          var stringifiedValue = "" + value
          var parsedValue = utils.parser(stringifiedValue)
          output += parsedValue;
          break;
      }
    }

    return output
  }

  TEST_OUTPUT = testFunction_FN()
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain("_FN(values");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(105);
});

test("Variant #11: Predictable function called with extraneous parameters", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function addTen(myArg){
      var ten = 10;
      return ten + myArg;
    }

    TEST_OUTPUT = addTen(5, -5000);
    `,
    {
      target: "node",
      movedDeclarations: true,
    },
  );

  expect(code).not.toContain("addTen(myArg,ten");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(15);
});

test("Variant #12: Move function declaration as parameter", async () => {
  var code = `
  var outsideVar = "Correct Value";

  function myFunction(){
    function getCorrectValue1(){
      return "Correct Value";
    }

    let var1 = "Correct Value";
    function getCorrectValue2(){
      return var1;
    }

    let var2;
    var2 = "Correct Value";

    function getCorrectValue3(){
      return var2;
    }

    function getCorrectValue4(){
      if(var2) {
        return outsideVar;
      }
    }

    TEST_OUTPUT = [
      getCorrectValue1(),
      getCorrectValue2(),
      getCorrectValue3(),
      getCorrectValue4()
    ];
  }

  myFunction();
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "node",
    movedDeclarations: true,
  });

  expect(output).toContain(
    "myFunction(getCorrectValue1,getCorrectValue2,getCorrectValue3,getCorrectValue4",
  );

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([
    "Correct Value",
    "Correct Value",
    "Correct Value",
    "Correct Value",
  ]);
});

test("Variant #13: Variable and parameter with the same name", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function abc(a, b, c) {
      var c = a + b + c;

      TEST_OUTPUT = c;
    }

    abc(1, 2, 3);
    `,
    {
      target: "node",
      movedDeclarations: true,

      // Harden the test by renaming variables
      renameVariables: true,
      identifierGenerator: "mangled",
    },
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(6);
});

async function evalESM(code: string): Promise<Record<string, unknown>> {
  const mod = new SourceTextModule(code, {
    context: createContext({ console }),
  });

  // fix #2: linker must return a Module — throw for any unexpected imports
  await mod.link((specifier: string): never => {
    throw new Error(`Import not supported in evalESM: '${specifier}'`);
  });

  await mod.evaluate();
  return mod.namespace as Record<string, unknown>;
}

// https://github.com/MichaelXF/js-confuser/issues/167
test("Variant #14: Don't break export declarations", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    export function abc(a, b) {
      var c = a + b;
      return c;
    }

    export var x = 10;

    export default function defaultExport() {
      return "Default Export";
    }
    `,
    {
      target: "node",
      movedDeclarations: true,
    },
  );

  var module: any = await evalESM(code);

  expect(module.x).toStrictEqual(10);
  expect(module.abc(1, 2)).toStrictEqual(3);
  expect(module.default()).toStrictEqual("Default Export");
});
