import { alphabeticalGenerator } from "../../src/utils/gen-utils";

describe("alphabeticalGenerator()", () => {
  test("Variant #1: Return correct outputs", async () => {
    expect(alphabeticalGenerator(1)).toStrictEqual("a");
    expect(alphabeticalGenerator(2)).toStrictEqual("b");
    expect(alphabeticalGenerator(3)).toStrictEqual("c");
    expect(alphabeticalGenerator(4)).toStrictEqual("d");
    expect(alphabeticalGenerator(5)).toStrictEqual("e");
    expect(alphabeticalGenerator(6)).toStrictEqual("f");
    expect(alphabeticalGenerator(7)).toStrictEqual("g");
    expect(alphabeticalGenerator(8)).toStrictEqual("h");
    expect(alphabeticalGenerator(10)).toStrictEqual("j");
    expect(alphabeticalGenerator(27)).toStrictEqual("A");
    expect(alphabeticalGenerator(28)).toStrictEqual("B");
    expect(alphabeticalGenerator(29)).toStrictEqual("C");

    expect(alphabeticalGenerator(90)).toStrictEqual("aL");
    expect(alphabeticalGenerator(900)).toStrictEqual("qp");

    var seen = new Set();
    for (var i = 1; i < 1000; i++) {
      var c = alphabeticalGenerator(i);

      expect(seen.has(c)).toStrictEqual(false);

      seen.add(c);
    }
  });
});
