/**
 * Creates an object from the given keys and values arrays.
 * @param keys
 * @param values
 */
export function createObject<T>(
  keys: string[],
  values: T[]
): { [key: string]: T } {
  if (keys.length !== values.length) {
    throw new Error("length mismatch");
  }

  var newObject = {};

  keys.forEach((x, i) => {
    newObject[x] = values[i];
  });

  return newObject;
}
