import {
  choice,
  getRandomHexString,
  getRandomString,
} from "../../src/utils/random-utils";

test("choice() should return a random element from an array", async () => {
  var sample = [10, 20, 30, 40, 50];

  var times = 50;
  for (var i = 0; i < times; i++) {
    var random = choice(sample);
    expect(sample).toContain(random);
  }
});

test("getRandomString() should return a random string with exact length", async () => {
  expect(typeof getRandomString(6)).toStrictEqual("string");
  expect(getRandomString(6).length).toStrictEqual(6);
});

test("getRandomHexString() should return a random hex string with exact length", async () => {
  expect(typeof getRandomHexString(6)).toStrictEqual("string");
  expect(getRandomHexString(6).length).toStrictEqual(6);
  expect(getRandomHexString(6)).toMatch(/^[0-9A-F]+$/);
});
