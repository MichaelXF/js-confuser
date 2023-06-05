import Obfuscator from "../../src/obfuscator";
import Transform from "../../src/transforms/transform";

describe("Transform class", () => {
  class MyTransformClass extends Transform {
    constructor(o) {
      super(o);
    }
  }

  const myObfuscator = new Obfuscator({
    target: "node",
    identifierGenerator: "mangled",
  });
  const myTransform = new MyTransformClass(myObfuscator);

  const tree = {
    type: "Program",
    body: [],
  };

  test("Variant #1: Not implemented match()", () => {
    expect(() => myTransform.match(tree, [])).toThrow();
  });

  test("Variant #2: Not implemented transform()", () => {
    expect(() => myTransform.transform(tree, [])).toThrow();
  });

  test("Variant #3: getGenerator()", () => {
    const generator = myTransform.getGenerator();

    const generated = new Set<string>();

    const count = 50;

    for (var i = 0; i < count; i++) {
      const newName = generator.generate();
      generated.add(newName);
    }

    // This ensures all generated names are unique!
    expect(generated.size).toStrictEqual(count);
  });

  test("Variant #4: getGenerator() with overrideMode parameter", () => {
    // number generator
    const generator = myTransform.getGenerator("number");

    expect(generator.generate()).toStrictEqual("var_1");
    expect(generator.generate()).toStrictEqual("var_2");
    expect(generator.generate()).toStrictEqual("var_3");

    // hexadecimal generator
    const anotherGenerator = myTransform.getGenerator("hexadecimal");

    expect(anotherGenerator.generate()).toContain("_0x");

    // mangled generator
    const yetAnotherGenerator = myTransform.getGenerator("mangled");

    expect(yetAnotherGenerator.generate()).toStrictEqual("a");
    expect(yetAnotherGenerator.generate()).toStrictEqual("b");
    expect(yetAnotherGenerator.generate()).toStrictEqual("c");
  });
});
