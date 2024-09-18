import { IntGen } from "../../src/utils/IntGen";

test("Variant #1: Generate random integers", () => {
  const intGen = new IntGen(-25, 25);
  const ints = new Set<number>();
  const count = 200;

  for (var i = 0; i < count; i++) {
    ints.add(intGen.generate());
  }

  expect(ints.size).toStrictEqual(count);
});
