import Obfuscator from "../../src/obfuscator";
import { getFunctionName } from "../../src/utils/ast-utils";
import traverse from "@babel/traverse";

describe("getFunctionName", () => {
  test("Variant #1: Function Declaration / Expression", () => {
    var file = Obfuscator.parseCode(`
      function myFunctionDeclaration(){}
      (function myFunctionExpression(){})
      `);

    var count = 0;

    traverse(file, {
      FunctionDeclaration(path) {
        expect(getFunctionName(path)).toBe("myFunctionDeclaration");
        count++;
      },
      FunctionExpression(path) {
        expect(getFunctionName(path)).toBe("myFunctionExpression");
        count++;
      },
    });

    expect(count).toStrictEqual(2);
  });

  test("Variant #2: Variable Declaration", () => {
    var file = Obfuscator.parseCode(`
      var myFunctionVariable = function(){}
      var {myFunctionVariable2} = [
        function(){}
      ]
      `);

    var count = 0;

    traverse(file, {
      FunctionExpression(path) {
        expect(getFunctionName(path)).toBe(
          ["myFunctionVariable", "anonymous"][count]
        );
        count++;
      },
    });

    expect(count).toStrictEqual(2);
  });

  test("Variant #3: Object property / method", () => {
    var file = Obfuscator.parseCode(`
      var object = {
        myFunctionProperty: function(){},
        myFunctionMethod(){},
        ["myEasyToComputeFunction"]: function(){},
        ["my" + "HardToComputeFunction"]: function(){},
      }
      `);

    var count = 0;

    traverse(file, {
      Function(path) {
        expect(getFunctionName(path)).toBe(
          [
            "myFunctionProperty",
            "myFunctionMethod",
            "myEasyToComputeFunction",
            "anonymous",
          ][count]
        );
        count++;
      },
    });

    expect(count).toStrictEqual(4);
  });

  test("Variant #4: Class methods", () => {
    var file = Obfuscator.parseCode(`
      class MyClass {
        myMethod(){}
        myProperty = function(){};
        ["myEasyToComputeFunction"](){}
        ["my" + "HardToComputeFunction"](){}
      }
      `);

    var count = 0;

    traverse(file, {
      Function(path) {
        expect(getFunctionName(path)).toBe(
          ["myMethod", "myProperty", "myEasyToComputeFunction", "anonymous"][
            count
          ]
        );
        count++;
      },
    });

    expect(count).toStrictEqual(4);
  });
});
