import {
  alphabeticalGenerator,
  choice,
  getRandomFalseExpression,
  getRandomString,
  getRandomTrueExpression,
} from "../../src/util/random";

const escodegen = require("escodegen");

it("choice() should return a random element from an array", async () => {
  var sample = [10, 20, 30, 40, 50];

  var times = 50;
  for (var i = 0; i < times; i++) {
    var random = choice(sample);
    expect(sample).toContain(random);
  }
});

it("getRandomString() should return a random string with exact length", async () => {
  expect(typeof getRandomString(6)).toStrictEqual("string");
  expect(getRandomString(6).length).toStrictEqual(6);
});

it("getRandomFalseExpression() should always eval to false", async () => {
  var times = 50;
  for (var i = 0; i < times; i++) {
    var expr = getRandomFalseExpression();
    var code = escodegen.generate(expr);

    expect(eval("!!" + code)).toStrictEqual(false);
  }
});

it("getRandomTrueExpression() should always eval to true", async () => {
  var times = 50;
  for (var i = 0; i < times; i++) {
    var expr = getRandomTrueExpression();
    var code = escodegen.generate(expr);

    expect(eval("!!" + code)).toStrictEqual(true);
  }
});

it("alphabeticalGenerator should return correct outputs", async () => {
  expect(alphabeticalGenerator(1)).toStrictEqual("A");
  expect(alphabeticalGenerator(2)).toStrictEqual("B");
  expect(alphabeticalGenerator(3)).toStrictEqual("C");
  expect(alphabeticalGenerator(4)).toStrictEqual("D");
  expect(alphabeticalGenerator(5)).toStrictEqual("E");
  expect(alphabeticalGenerator(6)).toStrictEqual("F");
  expect(alphabeticalGenerator(7)).toStrictEqual("G");
  expect(alphabeticalGenerator(8)).toStrictEqual("H");
  expect(alphabeticalGenerator(10)).toStrictEqual("J");
  expect(alphabeticalGenerator(90)).toStrictEqual("CL");
  expect(alphabeticalGenerator(900)).toStrictEqual("AHP");
});
