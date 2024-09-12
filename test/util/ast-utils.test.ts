import { ok } from "assert";
import Obfuscator from "../../src/obfuscator";
import {
  getFunctionName,
  isDefiningIdentifier,
} from "../../src/utils/ast-utils";
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

describe("isDefiningIdentifier", () => {
  function getIdentifierPath(sourceCode: string, targetIdentifierName = "id") {
    var ast = Obfuscator.parseCode(sourceCode);
    var returnPath;

    traverse(ast, {
      Identifier(path) {
        if (path.node.name === targetIdentifierName) {
          returnPath = path;
        }
      },
    });

    ok(returnPath, `${targetIdentifierName} not found in ${sourceCode}`);

    return returnPath;
  }

  test("Variant #1: True examples", () => {
    `
    var id = 1
    let id = 1
    const id = 1
    function id(){}
    class id{}
    var {id} = {}
    var [id] = []
    var {id = 1} = {}
    var [id = 1] = []
    var {_: id} = {}
    var _, id;
    function f(id){}
    function f(_, id){}
    function f({id}){}
    function f([id]){}
    function f({id = 1}){}
    function f([id = 1]){}
    function f(...id){}
    function f(...[{id = _}]){}
    try{}catch(id){}
    try{}catch({id}){}
    try{}catch([{id}]){}
    try{}catch({_: id}){}
    for(var id in []){}
    for(var id of []){}
     `
      .split("\n")
      .forEach((sourceCode) => {
        if (!sourceCode.trim()) return;

        const path = getIdentifierPath(sourceCode);
        var result = isDefiningIdentifier(path);
        if (!result) {
          throw new Error(
            `Expected true, got false. Source code: ${sourceCode} ${path.key}`
          );
        }
      });
  });

  test("Variant #2: False examples", () => {
    `
    id;
    id();
    id = 1;
    id++;
    delete id;
    typeof id;
    id instanceof Object;
    {id: true}
    var {id: _} = {};
    function f(_ = id){}
    function f(_ = {id}){}
    function f(_ = [id]){}
    function f(_ = [...id]){}
    for(id in []){}
    for(id of []){}
    for(id = 0; id < 1; id++){}
    try{}catch({id: _}){}
    try{}catch({_: _ = id}){}
    try{}catch({id: _ = _}){}
    try{}catch({_ = id}){}
     `
      .split("\n")
      .forEach((sourceCode) => {
        if (!sourceCode.trim()) return;

        const path = getIdentifierPath(sourceCode);
        var result = isDefiningIdentifier(path);
        if (result) {
          throw new Error(
            `Expected false, got true. Source code: ${sourceCode} ${path.key}`
          );
        }
      });
  });
});
