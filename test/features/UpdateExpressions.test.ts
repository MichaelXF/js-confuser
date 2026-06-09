import { obfuscate, evalCode } from "../test-utils";

test("Variant #1: Pre/Post increment and decrement on Identifier", async () => {
  const { code } = await obfuscate(`
    let a = 1;
    a++;
    window.TEST_OUTPUT = [
      a++,
      a--,
      a--,
      a--,
      ++a,
      --a,
      ++a
    ];
  `);

  expect(await evalCode(code)).toEqual([2, 3, 2, 1, 1, 0, 1]);
});

test("Variant #2: Pre/Post increment and decrement on MemberExpression", async () => {
  const { code } = await obfuscate(`
    let myObject = {
      myCounter: 1
    };
    myObject.myCounter++;
    window.TEST_OUTPUT = [
      myObject.myCounter++,
      myObject.myCounter--,
      myObject.myCounter--,
      myObject.myCounter--,
      ++myObject.myCounter,
      --myObject.myCounter,
      ++myObject.myCounter
    ];
  `);

  expect(await evalCode(code)).toEqual([2, 3, 2, 1, 1, 0, 1]);
});
