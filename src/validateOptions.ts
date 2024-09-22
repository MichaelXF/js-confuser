import { ok } from "assert";
import { ObfuscateOptions } from "./options";
import presets from "./presets";

const validProperties = new Set([
  "preset",
  "target",
  "compact",
  "hexadecimalNumbers",
  "minify",
  "renameVariables",
  "renameGlobals",
  "renameLabels",
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
  "variableMasking",
  "verbose",
  "globalVariables",
  "debugComments",
  "preserveFunctionLength",
  "astScrambler",
  "customStringEncodings",
  "functionOutlining",
  "pack",
]);

const validLockProperties = new Set([
  "selfDefending",
  "antiDebug",
  "tamperProtection",
  "startDate",
  "endDate",
  "domainLock",
  "integrity",
  "countermeasures",
  "customLocks",
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

  if (options.lock) {
    ok(typeof options.lock === "object", "options.lock must be an object");
    Object.keys(options.lock).forEach((key) => {
      if (!validLockProperties.has(key)) {
        throw new TypeError("Invalid lock option: '" + key + "'");
      }
    });

    // Validate domain-lock option
    if (
      options.lock.domainLock &&
      typeof options.lock.domainLock !== "undefined"
    ) {
      ok(Array.isArray(options.lock.domainLock), "domainLock must be an array");
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

  if (!options.hasOwnProperty("compact")) {
    options.compact = true; // Compact is on by default
  }
  if (!options.hasOwnProperty("renameGlobals")) {
    options.renameGlobals = true; // RenameGlobals is on by default
  }
  if (!options.hasOwnProperty("preserveFunctionLength")) {
    options.preserveFunctionLength = true; // preserveFunctionLength is on by default
  }
  if (!options.hasOwnProperty("renameLabels")) {
    options.renameLabels = true; // RenameLabels is on by default
  }

  if (options.lock) {
    ok(typeof options.lock === "object", "options.lock must be an object");

    if (options.lock.selfDefending) {
      options.compact = true; // self defending forcibly enables this
    }

    if (!options.lock.customLocks) {
      options.lock.customLocks = [];
    }

    // Convert 'startDate' and 'endDate' to Dates
    if (typeof options.lock.startDate === "number") {
      options.lock.startDate = new Date(options.lock.startDate);
    }

    if (typeof options.lock.endDate === "number") {
      options.lock.endDate = new Date(options.lock.endDate);
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
      "RegExp",
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
      "TextDecoder",
      "TextEncoder",
      "Uint8Array",
      "Uint16Array",
      "Uint32Array",
      "Int8Array",
      "Int16Array",
      "Int32Array",
      "ArrayBuffer",
      "btoa",
      "atob",
      "unescape",
      "encodeURIComponent",
    ].forEach((x) => options.globalVariables.add(x));
  }

  return options;
}
