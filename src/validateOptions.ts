import { ok } from "assert";
import { ObfuscateOptions } from "./options";
import presets from "./presets";

const validProperties = new Set([
  "preset",
  "target",
  "indent",
  "compact",
  "hexadecimalNumbers",
  "minify",
  "es5",
  "renameVariables",
  "renameGlobals",
  "identifierGenerator",
  "controlFlowFlattening",
  "globalConcealing",
  "stringCompression",
  "stringConcealing",
  "stringEncoding",
  "stringSplitting",
  "duplicateLiteralsRemoval",
  "dispatcher",
  "rgf",
  "objectExtraction",
  "flatten",
  "deadCode",
  "calculator",
  "lock",
  "movedDeclarations",
  "opaquePredicates",
  "shuffle",
  "stack",
  "verbose",
  "globalVariables",
  "debugComments",
  "preserveFunctionLength",
  "astScrambler",
]);

const validLockProperties = new Set([
  "selfDefending",
  "antiDebug",
  "context",
  "tamperProtection",
  "startDate",
  "endDate",
  "domainLock",
  "osLock",
  "browserLock",
  "integrity",
  "countermeasures",
]);

const validOses = new Set(["windows", "linux", "osx", "ios", "android"]);
const validBrowsers = new Set([
  "firefox",
  "chrome",
  "iexplorer",
  "edge",
  "safari",
  "opera",
]);

export function validateOptions(options: ObfuscateOptions) {
  if (!options || Object.keys(options).length <= 1) {
    /**
     * Give a welcoming introduction to those who skipped the documentation.
     */
    var line = `You provided zero obfuscation options. By default everything is disabled.\nYou can use a preset with:\n\n> {target: '${
      options.target || "node"
    }', preset: 'high' | 'medium' | 'low'}.\n\n\nView all settings here:\nhttps://github.com/MichaelXF/js-confuser#options`;
    throw new Error(
      `\n\n` +
        line
          .split("\n")
          .map((x) => `\t${x}`)
          .join("\n") +
        `\n\n`
    );
  }

  ok(options, "options cannot be null");
  ok(
    options.target,
    "Missing options.target option (required, must one the following: 'browser' or 'node')"
  );

  ok(
    ["browser", "node"].includes(options.target),
    `'${options.target}' is not a valid target mode`
  );

  Object.keys(options).forEach((key) => {
    if (!validProperties.has(key)) {
      throw new TypeError("Invalid option: '" + key + "'");
    }
  });

  if (
    options.target === "node" &&
    options.lock &&
    options.lock.browserLock &&
    options.lock.browserLock.length
  ) {
    throw new TypeError('browserLock can only be used when target="browser"');
  }

  if (options.lock) {
    ok(typeof options.lock === "object", "options.lock must be an object");
    Object.keys(options.lock).forEach((key) => {
      if (!validLockProperties.has(key)) {
        throw new TypeError("Invalid lock option: '" + key + "'");
      }
    });

    // Validate browser-lock option
    if (
      options.lock.browserLock &&
      typeof options.lock.browserLock !== "undefined"
    ) {
      ok(
        Array.isArray(options.lock.browserLock),
        "browserLock must be an array"
      );
      ok(
        !options.lock.browserLock.find(
          (browserName) => !validBrowsers.has(browserName)
        ),
        'Invalid browser name. Allowed: "firefox", "chrome", "iexplorer", "edge", "safari", "opera"'
      );
    }
    // Validate os-lock option
    if (options.lock.osLock && typeof options.lock.osLock !== "undefined") {
      ok(Array.isArray(options.lock.osLock), "osLock must be an array");
      ok(
        !options.lock.osLock.find((osName) => !validOses.has(osName)),
        'Invalid OS name. Allowed: "windows", "linux", "osx", "ios", "android"'
      );
    }
    // Validate domain-lock option
    if (
      options.lock.domainLock &&
      typeof options.lock.domainLock !== "undefined"
    ) {
      ok(Array.isArray(options.lock.domainLock), "domainLock must be an array");
    }

    // Validate context option
    if (options.lock.context && typeof options.lock.context !== "undefined") {
      ok(Array.isArray(options.lock.context), "context must be an array");
    }

    // Validate start-date option
    if (
      typeof options.lock.startDate !== "undefined" &&
      options.lock.startDate
    ) {
      ok(
        typeof options.lock.startDate === "number" ||
          options.lock.startDate instanceof Date,
        "startDate must be Date object or number"
      );
    }

    // Validate end-date option
    if (typeof options.lock.endDate !== "undefined" && options.lock.endDate) {
      ok(
        typeof options.lock.endDate === "number" ||
          options.lock.endDate instanceof Date,
        "endDate must be Date object or number"
      );
    }
  }

  if (options.preset) {
    if (!presets[options.preset]) {
      throw new TypeError("Unknown preset of '" + options.preset + "'");
    }
  }
}

/**
 * Sets the default values and validates the configuration.
 */
export function applyDefaultsToOptions(
  options: ObfuscateOptions
): ObfuscateOptions {
  if (options.preset) {
    // Clone and allow overriding
    options = Object.assign({}, presets[options.preset], options);
  }

  if (!options.hasOwnProperty("debugComments")) {
    options.debugComments = false; // debugComments is off by default
  }

  if (!options.hasOwnProperty("compact")) {
    options.compact = true; // Compact is on by default
  }
  if (!options.hasOwnProperty("renameGlobals")) {
    options.renameGlobals = true; // RenameGlobals is on by default
  }
  if (!options.hasOwnProperty("preserveFunctionLength")) {
    options.preserveFunctionLength = true; // preserveFunctionLength is on by default
  }

  if (options.globalVariables && !(options.globalVariables instanceof Set)) {
    options.globalVariables = new Set(Object.keys(options.globalVariables));
  }

  if (options.lock) {
    if (options.lock.selfDefending) {
      options.compact = true; // self defending forcibly enables this
    }
  }

  // options.globalVariables outlines generic globals that should be present in the execution context
  if (!options.hasOwnProperty("globalVariables")) {
    options.globalVariables = new Set([]);

    if (options.target == "browser") {
      // browser
      [
        "window",
        "document",
        "postMessage",
        "alert",
        "confirm",
        "location",
        "btoa",
        "atob",
        "unescape",
        "encodeURIComponent",
      ].forEach((x) => options.globalVariables.add(x));
    } else {
      // node
      [
        "global",
        "Buffer",
        "require",
        "process",
        "exports",
        "module",
        "__dirname",
        "__filename",
      ].forEach((x) => options.globalVariables.add(x));
    }

    [
      "globalThis",
      "console",
      "parseInt",
      "parseFloat",
      "Math",
      "JSON",
      "Promise",
      "String",
      "Boolean",
      "Function",
      "Object",
      "Array",
      "Proxy",
      "Error",
      "TypeError",
      "ReferenceError",
      "RangeError",
      "EvalError",
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "queueMicrotask",
      "isNaN",
      "isFinite",
      "Set",
      "Map",
      "WeakSet",
      "WeakMap",
      "Symbol",
    ].forEach((x) => options.globalVariables.add(x));
  }

  return options;
}