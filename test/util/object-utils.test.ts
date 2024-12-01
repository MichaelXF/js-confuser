import { createObject } from "../../src/utils/object-utils";

describe("createObject", () => {
  test("Variant #1: Simple object", () => {
    expect(createObject(["a", "b", "c"], [1, 2, 3])).toStrictEqual({
      a: 1,
      b: 2,
      c: 3,
    });
  });

  test("Variant #2: Length mismatch", () => {
    expect(() => createObject(["a", "b", "c", "d"], [1, 2, 3])).toThrow(
      "length mismatch"
    );
  });
});
