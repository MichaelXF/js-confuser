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

export function splitIntoChunks(array, min, max): any[] {
  var chunks = [];
  for (var i = 0; i < array.length; i += 0) {
    var currentLength = getRandomInteger(min, max);

    chunks.push(array.slice(i, i + currentLength));

    i += currentLength;
  }

  return chunks;
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
    case "emptyString":
      return Literal("");
  }

  return Literal(false);
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
    case "undefined":
      return Identifier("undefined");
    case "Infinity":
      return Identifier("Infinity");
    case "nonEmptyString":
      return Literal(getRandomString(getRandomInteger(3, 9)));
    case "array":
      return ArrayExpression([]);
    case "object":
      return ObjectExpression([]);
  }

  return Literal(false);
}

export function getRandomExpression(nested = false) {
  var type = choice(["object", "literal"]);

  if (type == "object") {
    return ObjectExpression(
      Array(getRandomInteger(2, 7))
        .fill(0)
        .map((x) => {
          var key = Literal(getRandomString(getRandomInteger(3, 7)));
          var computed = false;

          // why is TypeScript so fucking dumb about isNaN
          if (
            typeof key.value == "string" &&
            isNaN(key.value.charAt(0) as any)
          ) {
            key = Identifier(key.value);
            computed = false;
          }

          return Property(
            key,
            nested ? getRandomExpression() : getRandomLiteral(),
            computed
          );
        })
    );
  } else {
    return getRandomLiteral();
  }
}

export function getRandomLiteral(): Node {
  var type = choice(["number", "string", "boolean", "undefined", "null"]);

  switch (type) {
    case "number":
      return Literal(getRandomInteger(1, 100));
    case "string":
      return Literal(getRandomString(getRandomInteger(5, 14)));
    case "boolean":
      return Literal(choice([true, false]));
    case "undefined":
      return Identifier("undefined");
    case "null":
      return Identifier("null");
  }

  throw new Error("type=" + type);
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
