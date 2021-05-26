import { isBlock } from "../../src/traverse";
import { isContext, isFunction } from "../../src/util/insert";

it("isBlock() should be true for block statements and program", async () => {
  expect(isBlock({ type: "Program", body: [] })).toStrictEqual(true);
  expect(isBlock({ type: "BlockStatement", body: [] })).toStrictEqual(true);
});

it("isContext() should return true for Function Nodes", () => {
  expect(isContext({ type: "FunctionDeclaration" })).toStrictEqual(true);
  expect(isContext({ type: "FunctionExpression" })).toStrictEqual(true);
  expect(isContext({ type: "ArrowFunctionExpression" })).toStrictEqual(true);
});

it("isFunction() should return true for Function Nodes", () => {
  expect(isFunction({ type: "FunctionDeclaration" })).toStrictEqual(true);
  expect(isFunction({ type: "FunctionExpression" })).toStrictEqual(true);
  expect(isFunction({ type: "ArrowFunctionExpression" })).toStrictEqual(true);
});

it("isContext() should return true for the Program Node (root node)", () => {
  expect(isContext({ type: "Program" })).toStrictEqual(true);
});
