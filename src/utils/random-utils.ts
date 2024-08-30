import { ok } from "assert";

/**
 * Returns a random element from the given array
 * @param choices Array of items
 * @returns One of the items in the array at random
 */
export function choice<T>(choices: T[]): T {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

/**
 * Returns a true/false based on the percent chance (0%-100%)
 * @param percentChance AS A PERCENTAGE 0 - 100%
 */
export function chance(percentChance: number): boolean {
  return Math.random() < percentChance / 100;
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
 * Returns a random hexadecimal string.
 *
 * @example getRandomHexString(6) => "CA96BF"
 * @param length
 * @returns
 */
export function getRandomHexString(length = 6) {
  return [...Array(length)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("")
    .toUpperCase();
}

/**
 * Returns a random string.
 */
export function getRandomString(length = 10) {
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

export function splitIntoChunks(str: string, size: number) {
  ok(typeof str === "string", "str must be typeof string");
  ok(typeof size === "number", "size must be typeof number");
  ok(Math.floor(size) === size, "size must be integer");

  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}
