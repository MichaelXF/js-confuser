import {
  Literal,
  ObjectExpression,
  Identifier,
  Property,
  Node,
  ArrayExpression,
} from "./gen";

export function choice<T>(choices: T[]): T {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

/**
 * **Mutates the given array**
 * @param array
 */
export function shuffle(array: any[]): any[] {
  array.sort(() => Math.random() - 0.5);
  return array;
}

/**
 * Returns a random string.
 */
export function getRandomString(length: number) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

export function getRandomInteger(min, max) {
  return Math.floor(getRandom(min, max));
}

export function splitIntoChunks(string: string): any[] {
  return string.match(/.{1,8}/g);
}

/**
 * Returns a random expression that will test to `false`.
 */
export function getRandomFalseExpression() {
  var type = choice(["0", "false", "null", "undefined", "NaN", "emptyString"]);

  switch (type) {
    case "0":
      return Literal(0);
    case "false":
      return Literal(false);
    case "null":
      return Identifier("null");
    case "undefined":
      return Identifier("undefined");
    case "NaN":
      return Identifier("NaN");
    default:
      // case "emptyString":
      return Literal("");
  }
}

/**
 * Returns a random expression that will test to `true`
 */
export function getRandomTrueExpression() {
  var type = choice([
    "number",
    "true",
    "Infinity",
    "nonEmptyString",
    "array",
    "object",
  ]);

  switch (type) {
    case "number":
      return Literal(getRandomInteger(1, 100));
    case "true":
      return Identifier("true");
    case "Infinity":
      return Identifier("Infinity");
    case "nonEmptyString":
      return Literal(getRandomString(getRandomInteger(3, 9)));
    case "array":
      return ArrayExpression([]);
    default:
      //case "object":
      return ObjectExpression([]);
  }
}

export function alphabeticalGenerator(index: number) {
  let name = "";
  while (index > 0) {
    var t = (index - 1) % 26;
    name = String.fromCharCode(65 + t) + name;
    index = ((index - t) / 26) | 0;
  }
  if (!name) {
    name = "_";
  }
  return name;
}
