import Template from "../src/templates/template";
import { isIndependent } from "../src/util/compare";
import {
  ArrayExpression,
  FunctionExpression,
  Identifier,
  Literal,
} from "../src/util/gen";

describe("isIndependent", () => {
  it("should return true for literals", () => {
    expect(isIndependent(Literal("String"), [])).toStrictEqual(true);
  });

  it("should return false for identifiers", () => {
    expect(
      isIndependent(Identifier("variable"), [{ type: "Program" }])
    ).toStrictEqual(false);
  });

  it("should return true for reserved identifiers (undefined, NaN, etc)", () => {
    expect(
      isIndependent(Identifier("undefined"), [{ type: "Program" }])
    ).toStrictEqual(true);
  });

  it("should return true for arrays of literals", () => {
    expect(
      isIndependent(ArrayExpression([Literal("String")]), [])
    ).toStrictEqual(true);
  });

  it("should return false for arrays with identifiers", () => {
    expect(
      isIndependent(
        ArrayExpression([Literal("String"), Identifier("variable")]),
        []
      )
    ).toStrictEqual(false);
  });

  it("should return false for everything else", () => {
    expect(isIndependent(FunctionExpression([], []), [])).toStrictEqual(false);
  });

  it("various cases", () => {
    expect(
      isIndependent(
        new Template(`({
      x: 1,
      y: 2,
      z: 3,
    })`).single().expression,
        []
      )
    ).toStrictEqual(true);

    expect(
      isIndependent(
        new Template(`({
      x: 1,
      y: 2,
      z: [3,4,5,6,7,"My String",undefined,null,NaN],
    })`).single().expression,
        []
      )
    ).toStrictEqual(true);

    expect(
      isIndependent(
        new Template(`({
      x: 1,
      y: 2,
      z: 3,
      _: function(){return value}
    })`).single().expression,
        []
      )
    ).toStrictEqual(false);

    expect(
      isIndependent(
        new Template(`({
      x: 1,
      y: 2,
      z: 3,
      _: [value]
    })`).single().expression,
        []
      )
    ).toStrictEqual(false);

    expect(
      isIndependent(
        new Template(`([
          {
            x: value
          }
        ])`).single().expression,
        []
      )
    ).toStrictEqual(false);
  });
});
