import { ok } from "assert";
import { compileJsSync } from "../../src/compiler";
import parseJS, { parseSync } from "../../src/parser";
import traverse, { isBlock } from "../../src/traverse";
import { Identifier, Location } from "../../src/util/gen";
import {
  deleteDeclaration,
  isVarContext,
  isFunction,
  deleteDirect,
  getContexts,
  getLexContext,
  getVarContext,
  computeFunctionLength,
} from "../../src/util/insert";

it("isBlock() should be true for block statements and program", async () => {
  expect(isBlock({ type: "Program", body: [] })).toStrictEqual(true);
  expect(isBlock({ type: "BlockStatement", body: [] })).toStrictEqual(true);
});

it("isVarContext() should return true for Function Nodes", () => {
  expect(isVarContext({ type: "FunctionDeclaration" })).toStrictEqual(true);
  expect(isVarContext({ type: "FunctionExpression" })).toStrictEqual(true);
  expect(isVarContext({ type: "ArrowFunctionExpression" })).toStrictEqual(true);
});

it("isFunction() should return true for Function Nodes", () => {
  expect(isFunction({ type: "FunctionDeclaration" })).toStrictEqual(true);
  expect(isFunction({ type: "FunctionExpression" })).toStrictEqual(true);
  expect(isFunction({ type: "ArrowFunctionExpression" })).toStrictEqual(true);
});

it("isVarContext() should return true for the Program Node (root node)", () => {
  expect(isVarContext({ type: "Program" })).toStrictEqual(true);
});

it("should delete variable declarations correctly", async () => {
  var tree = await parseJS("var a = 1;");

  deleteDeclaration(tree.body[0].declarations[0], [
    tree.body[0].declarations,
    tree.body[0],
    tree.body,
    tree,
  ]);

  expect(tree.body.length).toStrictEqual(0);
});

it("should delete function declarations correctly", async () => {
  var tree = await parseJS("function a(){}");

  deleteDeclaration(tree.body[0], [tree.body as any, tree]);

  expect(tree.body.length).toStrictEqual(0);
});

it("should delete variable declarations with multiple declarations without leave side-effects", async () => {
  var tree = await parseJS("var a = 1, b = 1, c = 1");

  // delete "b"
  deleteDeclaration(tree.body[0].declarations[1], [
    tree.body[0].declarations,
    tree.body[0],
    tree.body,
    tree,
  ]);

  expect(tree.body.length).toStrictEqual(1);
  expect(tree.body[0].declarations.length).toStrictEqual(2);
  expect(tree.body[0].declarations.find((x) => x.id.name == "b")).toBeFalsy();
  expect(tree.body[0].declarations.map((x) => x.id.name)).toEqual(["a", "c"]);
});

it("getContexts should return correct results", () => {
  expect(getContexts({ type: "Program", body: [] }, [])).toEqual([
    { type: "Program", body: [] },
  ]);
});

it("should throw when missing parameters", () => {
  expect(deleteDirect).toThrow();
  expect(() => deleteDirect(Identifier("node"), null)).toThrow();

  expect(getLexContext).toThrow();
  expect(getVarContext).toThrow();
  expect(() => getLexContext(Identifier("test"), [])).toThrow();
  expect(() => getVarContext(Identifier("test"), [])).toThrow();
});

test("computeFunctionLength", () => {
  var tree = parseSync(`
  function zeroParameters(){}; // 0
  function oneParameter(a){}; // 1
  function twoParameter(a,b){}; // 2
  function restParameter1(...a){}; // 0
  function restParameter2(a,b,...c){}; // 2
  function defaultValue(a,b,c=1,d){}; // 2
  function arrayPattern([a],[b = 2],[[c]]){}; // 3
  function objectPattern({a},{b = 2},{c, d}){}; // 3
  function mixed(a,{b},[c = 3],d,e=5,f,...g){}; // 4
  `);

  function getFunction(searchName: string): Location {
    var searchLocation: Location;
    traverse(tree, (o, p) => {
      if (o.type === "FunctionDeclaration" && o.id.name === searchName) {
        ok(!searchLocation);
        searchLocation = [o, p];
      }
    });

    ok(searchLocation);
    return searchLocation;
  }

  expect(
    computeFunctionLength(getFunction("zeroParameters")[0].params)
  ).toStrictEqual(0);
  expect(
    computeFunctionLength(getFunction("oneParameter")[0].params)
  ).toStrictEqual(1);
  expect(
    computeFunctionLength(getFunction("twoParameter")[0].params)
  ).toStrictEqual(2);
  expect(
    computeFunctionLength(getFunction("restParameter1")[0].params)
  ).toStrictEqual(0);
  expect(
    computeFunctionLength(getFunction("restParameter2")[0].params)
  ).toStrictEqual(2);
  expect(
    computeFunctionLength(getFunction("arrayPattern")[0].params)
  ).toStrictEqual(3);
  expect(
    computeFunctionLength(getFunction("objectPattern")[0].params)
  ).toStrictEqual(3);
  expect(computeFunctionLength(getFunction("mixed")[0].params)).toStrictEqual(
    4
  );
});
