import {
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
