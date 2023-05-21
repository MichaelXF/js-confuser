import { isEquivalent, isValidIdentifier } from "../../src/util/compare";
import { Identifier } from "../../src/util/gen";

it("should compare nodes correctly", () => {
  expect(isEquivalent(Identifier("name"), Identifier("name"))).toStrictEqual(
    true
  );

  expect(
    isEquivalent(Identifier("name"), Identifier("different_name"))
  ).toStrictEqual(false);
});

describe("isValidIdentifier", () => {
  test("Variant #1: Basic examples", () => {
    // true examples
    expect(isValidIdentifier("myClass")).toStrictEqual(true);
    expect(isValidIdentifier("MyClass")).toStrictEqual(true);
    expect(isValidIdentifier("$myObject")).toStrictEqual(true);
    expect(isValidIdentifier("_myObject")).toStrictEqual(true);
    expect(isValidIdentifier("myObject2")).toStrictEqual(true);
    expect(isValidIdentifier("_0")).toStrictEqual(true);

    // false examples
    expect(isValidIdentifier("0")).toStrictEqual(false);
    expect(isValidIdentifier("0myInvalidVar")).toStrictEqual(false);
    expect(isValidIdentifier("^")).toStrictEqual(false);
    expect(isValidIdentifier("%")).toStrictEqual(false);
    expect(isValidIdentifier("invalid*Var")).toStrictEqual(false);
    expect(isValidIdentifier("invalid!")).toStrictEqual(false);
    expect(isValidIdentifier("my invalid var")).toStrictEqual(false);
    expect(isValidIdentifier("my-invalid-var")).toStrictEqual(false);
  });
});
