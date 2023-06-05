import { isProbabilityMapProbable } from "../src/probability";

describe("isProbabilityMapProbable", function () {
  test("Variant #1: True examples", function () {
    expect(isProbabilityMapProbable(true)).toStrictEqual(true);
    expect(isProbabilityMapProbable(1)).toStrictEqual(true);
    expect(isProbabilityMapProbable(0.1)).toStrictEqual(true);

    expect(
      isProbabilityMapProbable({
        mode: 1,
      })
    ).toStrictEqual(true);

    expect(isProbabilityMapProbable(["mode"])).toStrictEqual(true);

    // Function are always true
    expect(isProbabilityMapProbable(() => true)).toStrictEqual(true);
    expect(isProbabilityMapProbable(() => false)).toStrictEqual(true);
  });

  test("Variant #2: False examples", function () {
    expect(isProbabilityMapProbable(false)).toStrictEqual(false);
    expect(isProbabilityMapProbable(0)).toStrictEqual(false);
    expect(isProbabilityMapProbable(undefined)).toStrictEqual(false);
    expect(isProbabilityMapProbable(null)).toStrictEqual(false);

    expect(isProbabilityMapProbable([false])).toStrictEqual(false);
  });

  test("Variant #3: Invalid examples", function () {
    // Invalid percentage
    expect(() => isProbabilityMapProbable(1.1)).toThrow();
    expect(() => isProbabilityMapProbable(50)).toThrow();
    expect(() => isProbabilityMapProbable(-0.1)).toThrow();
    expect(() => isProbabilityMapProbable(NaN)).toThrow();

    // Empty object
    expect(() => isProbabilityMapProbable({})).toThrow();

    // Empty array
    expect(() => isProbabilityMapProbable([])).toThrow();
  });
});
