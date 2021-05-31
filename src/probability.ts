import { createObject } from "./util/object";

type Stringed<V> = (V extends string ? V : never) | "true" | "false";

/**
 * Configurable probabilities for obfuscator options.
 * - **`false`** = this feature is disabled
 * - **`true`** = this feature is enabled, use default mode
 * - **`0.5`** = 50% chance
 * - **`"mode"`** = enabled, use specified mode
 * - **`["mode1", "mode2"]`** - enabled, choose random mode each occurrence
 * - **`{"mode1": 0.5, "mode2": 0.5}`** - enabled, choose based on specified probabilities
 * - **`{"mode1": 50, "mode2": 50}`** - enabled, each is divided based on total
 * - **`function(x){ return "custom_implementation" }`** - enabled, use specified function
 */
export type ProbabilityMap<T> =
  | false
  | true
  | number
  | T
  | T[]
  | { [key in Stringed<T>]?: number }
  | ((object: any) => any);

/**
 * Evaluates a ProbabilityMap.
 * @param map The setting object.
 * @param runner Custom function to determine return value
 * @param customFnArgs Args given to user-implemented function, such as a variable name.
 */
export function ComputeProbabilityMap<T>(
  map: ProbabilityMap<T>,
  runner: (mode?: T) => any = (x) => x,
  ...customFnArgs: any[]
): any {
  if (!map) {
    return runner();
  }
  if (map === true || map === 1) {
    return runner(true as any);
  }
  if (typeof map === "number") {
    return runner((Math.random() < map) as any);
  }

  if (typeof map === "function") {
    return (map as any)(...customFnArgs);
  }
  if (typeof map === "string") {
    return runner(map);
  }
  var asObject: { [mode: string]: number } = {};
  if (Array.isArray(map)) {
    map.forEach((x: any) => {
      asObject[x.toString()] = 1;
    });
  } else {
    asObject = map as any;
  }

  var total = Object.values(asObject).reduce((a, b) => a + b);
  var percentages = createObject(
    Object.keys(asObject),
    Object.values(asObject).map((x) => x / total)
  );

  var ticket = Math.random();

  var count = 0;
  var winner = null;
  Object.keys(percentages).forEach((key) => {
    var x = parseFloat(percentages[key]);

    if (ticket >= count && ticket < count + x) {
      winner = key;
    }
    count += x;
  });

  return runner(winner);
}
