import JsConfuser from "../src";

/**
 *
 * @param {string} source
 * @param {Parameters<import('../src/index.ts')["default"]["obfuscate"]>[1]} overrideOptions
 * @returns
 */
export async function obfuscate(source, overrideOptions?) {
  const options = overrideOptions ?? global.OPTIONS ?? {};
  if (!options.target) {
    options.target = "browser";
  }

  // TODO: test-utils.ts does not support overriding window in new Function() context
  options.pack = false;

  return await JsConfuser.obfuscate(source, options);
}

export async function evalCode(code, windowProperties = {}) {
  var window: any = { ...global, TEST_OUTPUT: null, ...windowProperties };

  for (const key of Object.getOwnPropertyNames(global)) {
    window[key] = global[key];
  }

  var globalThis = window; // Global Concealing first looks for "globalThis"
  window.String = String; // Global Concealing also looks for this

  window.global = window;
  window.window = window;

  // Important: eval() cannot be used as it inherits the strict mode context
  // new Function() runs our code in non-strict mode (Needed for This.test.ts)
  var fn = new Function("window", "globalThis", "global", code);
  fn(window, globalThis, global);

  return window.TEST_OUTPUT;
}
