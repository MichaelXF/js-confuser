import { ok } from "assert";
import Obfuscator from "../../src/obfuscator";
import {
  getFunctionName,
  getPatternIdentifierNames,
  isDefiningIdentifier,
  isUndefined,
} from "../../src/utils/ast-utils";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

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

function getIdentifierPath(
  sourceCode: string,
  targetIdentifierName = "id"
): NodePath<t.Identifier> {
  const ast = Obfuscator.parseCode(sourceCode);
  let returnPath;

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

describe("isDefiningIdentifier", () => {
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
    import id from "module"
    import * as id from "module"
    import {id} from "module"
    import {_ as id} from "module"
    import {_, id} from "module"
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
    import {id as _} from "module"
    import {_, id as __} from "module"
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

describe("getPatternIdentifierNames", () => {
  test("Variant #1: Function parameters", () => {
    var sampleOne = `
    function abc(id1, {id2}, {_: id3}, id4 = 1, {id5 = 1}, {_: [id6] = 1}, ...id7){}
    `;

    var path = getIdentifierPath(sampleOne, "id1");
    var functionPath = path.getFunctionParent()!;

    expect(functionPath.type).toStrictEqual("FunctionDeclaration");

    var result = getPatternIdentifierNames(functionPath.get("params"));
    expect(result).toStrictEqual(
      new Set(["id1", "id2", "id3", "id4", "id5", "id6", "id7"])
    );
  });
});

function getExpression(code) {
  var ast = Obfuscator.parseCode(code);

  ok(ast.program.body.length === 1);
  var returnPath: NodePath<t.Expression> | null = null;
  traverse(ast, {
    Program(path) {
      returnPath = path
        .get("body")[0]
        .get("expression") as NodePath<t.Expression>;

      ok(returnPath.isExpression());
    },
  });

  ok(returnPath);

  return returnPath!;
}

describe("isUndefined", () => {
  test("Variant #1: True examples", () => {
    expect(isUndefined(getExpression("undefined"))).toStrictEqual(true);
    expect(isUndefined(getExpression("void 0"))).toStrictEqual(true);
  });

  test("Variant #2: False examples", () => {
    expect(isUndefined(getExpression("myIdentifier"))).toStrictEqual(false);
    expect(isUndefined(getExpression("10+10"))).toStrictEqual(false);
  });
});
