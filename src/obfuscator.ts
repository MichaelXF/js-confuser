import { ok } from "assert";
import * as t from "@babel/types";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import { ObfuscateOptions, ProbabilityMap } from "./options";
import { applyDefaultsToOptions, validateOptions } from "./validateOptions";
import { ObfuscationResult, ProfilerCallback } from "./obfuscationResult";
import { NameGen } from "./utils/NameGen";
import { Order } from "./order";
import {
  PluginFunction,
  PluginInstance,
  PluginObject,
} from "./transforms/plugin";
import { createObject } from "./utils/object-utils";

// Transforms
import preparation from "./transforms/preparation";
import renameVariables from "./transforms/identifier/renameVariables";
import variableMasking from "./transforms/variableMasking";
import dispatcher from "./transforms/dispatcher";
import duplicateLiteralsRemoval from "./transforms/extraction/duplicateLiteralsRemoval";
import objectExtraction from "./transforms/extraction/objectExtraction";
import globalConcealing from "./transforms/identifier/globalConcealing";
import stringCompression from "./transforms/string/stringCompression";
import deadCode from "./transforms/deadCode";
import stringSplitting from "./transforms/string/stringSplitting";
import shuffle from "./transforms/shuffle";
import astScrambler from "./transforms/astScrambler";
import calculator from "./transforms/calculator";
import movedDeclarations from "./transforms/identifier/movedDeclarations";
import renameLabels from "./transforms/renameLabels";
import rgf from "./transforms/rgf";
import flatten from "./transforms/flatten";
import stringConcealing from "./transforms/string/stringConcealing";
import lock from "./transforms/lock/lock";
import controlFlowFlattening from "./transforms/controlFlowFlattening";
import opaquePredicates from "./transforms/opaquePredicates";
import minify from "./transforms/minify";
import finalizer from "./transforms/finalizer";
import integrity from "./transforms/lock/integrity";
import pack, { PackInterface } from "./transforms/pack";

export const DEFAULT_OPTIONS: ObfuscateOptions = {
  target: "node",
  compact: true,
};

export default class Obfuscator {
  plugins: {
    plugin: PluginObject;
    pluginInstance: PluginInstance;
  }[] = [];
  options: ObfuscateOptions;

  totalPossibleTransforms: number = 0;

  globalState = {
    lock: {
      integrity: {
        sensitivityRegex: / |\n|;|,|\{|\}|\(|\)|\.|\[|\]/g,
      },

      createCountermeasuresCode: (): t.Statement[] => {
        throw new Error("Not implemented");
      },
    },

    // After RenameVariables completes, this map will contain the renamed variables
    // Most use cases involve grabbing the Program(global) mappings
    renamedVariables: new Map<t.Node, Map<string, string>>(),

    // Internal functions, should not be renamed/removed
    internals: {
      stringCompressionLibraryName: "",
      nativeFunctionName: "",
      integrityHashName: "",
      invokeCountermeasuresFnName: "",
    },
  };

  // Pack Interface for sharing globals across RGF functions
  packInterface: PackInterface;

  isInternalVariable(name: string) {
    return Object.values(this.globalState.internals).includes(name);
  }

  shouldTransformNativeFunction(nameAndPropertyPath: string[]) {
    if (!this.options.lock?.tamperProtection) {
      return false;
    }

    // Custom implementation for Tamper Protection
    if (typeof this.options.lock.tamperProtection === "function") {
      return this.options.lock.tamperProtection(nameAndPropertyPath.join("."));
    }

    if (
      this.options.target === "browser" &&
      nameAndPropertyPath.length === 1 &&
      nameAndPropertyPath[0] === "fetch"
    ) {
      return true;
    }

    var globalObject = {};
    try {
      globalObject =
        typeof globalThis !== "undefined"
          ? globalThis
          : typeof window !== "undefined"
          ? window
          : typeof global !== "undefined"
          ? global
          : typeof self !== "undefined"
          ? self
          : new Function("return this")();
    } catch (e) {}

    var fn = globalObject;
    for (var item of nameAndPropertyPath) {
      fn = fn?.[item];
      if (typeof fn === "undefined") return false;
    }

    var hasNativeCode =
      typeof fn === "function" && ("" + fn).includes("[native code]");

    return hasNativeCode;
  }

  getStringCompressionLibraryName() {
    if (this.parentObfuscator) {
      return this.parentObfuscator.getStringCompressionLibraryName();
    }

    return this.globalState.internals.stringCompressionLibraryName;
  }

  getObfuscatedVariableName(originalName: string, programNode: t.Node) {
    const renamedVariables = this.globalState.renamedVariables.get(programNode);

    return renamedVariables?.get(originalName) || originalName;
  }

  /**
   * The main Name Generator for `Rename Variables`
   */
  nameGen: NameGen;

  public constructor(
    userOptions: ObfuscateOptions,
    public parentObfuscator?: Obfuscator
  ) {
    validateOptions(userOptions);
    this.options = applyDefaultsToOptions({ ...userOptions });
    this.nameGen = new NameGen(this.options.identifierGenerator);

    const shouldAddLockTransform =
      this.options.lock &&
      (Object.keys(this.options.lock).filter(
        (key) =>
          key !== "customLocks" &&
          this.isProbabilityMapProbable(this.options.lock[key])
      ).length > 0 ||
        this.options.lock.customLocks.length > 0);

    const allPlugins: PluginFunction[] = [];

    const push = (probabilityMap, ...pluginFns) => {
      this.totalPossibleTransforms += pluginFns.length;
      if (!this.isProbabilityMapProbable(probabilityMap)) return;

      allPlugins.push(...pluginFns);
    };

    push(true, preparation);
    push(this.options.objectExtraction, objectExtraction);
    push(this.options.flatten, flatten);
    push(shouldAddLockTransform, lock);
    push(this.options.rgf, rgf);
    push(this.options.dispatcher, dispatcher);
    push(this.options.deadCode, deadCode);
    push(this.options.controlFlowFlattening, controlFlowFlattening);
    push(this.options.calculator, calculator);
    push(this.options.globalConcealing, globalConcealing);
    push(this.options.opaquePredicates, opaquePredicates);
    push(this.options.stringSplitting, stringSplitting);
    push(this.options.stringConcealing, stringConcealing);
    // String Compression is only applied to the main obfuscator
    // Any RGF functions will not have string compression due to the size of the decompression function

    push(
      !parentObfuscator && this.options.stringCompression,
      stringCompression
    );
    push(this.options.variableMasking, variableMasking);
    push(this.options.duplicateLiteralsRemoval, duplicateLiteralsRemoval);
    push(this.options.shuffle, shuffle);
    push(this.options.movedDeclarations, movedDeclarations);
    push(this.options.renameLabels, renameLabels);
    push(this.options.minify, minify);
    push(this.options.astScrambler, astScrambler);
    push(this.options.renameVariables, renameVariables);

    push(true, finalizer);
    push(this.options.pack, pack);
    push(this.options.lock?.integrity, integrity);

    allPlugins.map((pluginFunction) => {
      var pluginInstance: PluginInstance;
      var plugin = pluginFunction({
        Plugin: (order: Order, mergeObject?) => {
          ok(typeof order === "number");
          var pluginOptions = {
            order,
            name: Order[order],
          };

          const newPluginInstance = new PluginInstance(pluginOptions, this);
          if (typeof mergeObject === "object" && mergeObject) {
            Object.assign(newPluginInstance, mergeObject);
          }

          pluginInstance = newPluginInstance;

          // @ts-ignore
          return newPluginInstance as any;
        },
      });

      ok(
        pluginInstance,
        "Plugin instance not created: " + pluginFunction.toString()
      );

      this.plugins.push({
        plugin,
        pluginInstance,
      });
    });

    this.plugins = this.plugins.sort(
      (a, b) => a.pluginInstance.order - b.pluginInstance.order
    );

    if (!parentObfuscator && this.hasPlugin(Order.StringCompression)) {
      this.globalState.internals.stringCompressionLibraryName =
        this.nameGen.generate(false);
    }
  }

  index: number = 0;

  obfuscateAST(
    ast: babel.types.File,
    options?: {
      profiler?: ProfilerCallback;
    }
  ): babel.types.File {
    let finalASTHandler: PluginObject["finalASTHandler"][] = [];

    for (let i = 0; i < this.plugins.length; i++) {
      this.index = i;
      const { plugin, pluginInstance } = this.plugins[i];

      if (this.options.verbose) {
        console.log(
          `Applying ${pluginInstance.name} (${i + 1}/${this.plugins.length})`
        );
      }

      traverse(ast, plugin.visitor);
      plugin.post?.();

      if (plugin.finalASTHandler) {
        finalASTHandler.push(plugin.finalASTHandler);
      }

      if (options?.profiler) {
        options?.profiler({
          index: i,
          currentTransform: pluginInstance.name,
          nextTransform: this.plugins[i + 1]?.pluginInstance?.name,
          totalTransforms: this.plugins.length,
        });
      }
    }

    for (const handler of finalASTHandler) {
      ast = handler(ast);
    }

    return ast;
  }

  async obfuscate(sourceCode: string): Promise<ObfuscationResult> {
    // Parse the source code into an AST
    let ast = Obfuscator.parseCode(sourceCode);

    ast = this.obfuscateAST(ast);

    // Generate the transformed code from the modified AST with comments removed and compacted output
    const code = this.generateCode(ast);

    return {
      code: code,
    };
  }

  getPlugin(order: Order) {
    return this.plugins.find((x) => x.pluginInstance.order === order);
  }

  hasPlugin(order: Order) {
    return !!this.getPlugin(order);
  }

  /**
   * Calls `Obfuscator.generateCode` with the current instance options
   */
  generateCode<T extends t.Node = t.File>(ast: T): string {
    return Obfuscator.generateCode(ast, this.options);
  }

  /**
   * Generates code from an AST using `@babel/generator`
   */
  static generateCode<T extends t.Node = t.File>(
    ast: T,
    options: ObfuscateOptions = DEFAULT_OPTIONS
  ): string {
    const compact = !!options.compact;

    const { code } = generate(ast, {
      comments: false, // Remove comments
      minified: compact,
      // jsescOption: {
      //   String Encoding using Babel
      //   escapeEverything: true,
      // },
    });

    return code;
  }

  /**
   * Parses the source code into an AST using `babel.parseSync`
   */
  static parseCode(sourceCode: string): babel.types.File {
    // Parse the source code into an AST
    let ast = parse(sourceCode, {
      sourceType: "unambiguous",
    });

    return ast;
  }

  probabilityMapCounter = new WeakMap<Object, number>();

  /**
   * Evaluates a ProbabilityMap.
   * @param map The setting object.
   * @param customFnArgs Args given to user-implemented function, such as a variable name.
   */
  computeProbabilityMap<
    T,
    F extends (...args: any[]) => any = (...args: any[]) => any
  >(
    map: ProbabilityMap<T, F>,
    ...customImplementationArgs: F extends (...args: infer P) => any ? P : never
  ): boolean | string {
    // Check if this probability map uses the {value: ..., limit: ...} format
    if (typeof map === "object" && map && "value" in map) {
      // Check for the limit property
      if ("limit" in map && typeof map.limit === "number" && map.limit >= 0) {
        // Check if the limit has been reached
        if (this.probabilityMapCounter.get(map) >= map.limit) {
          return false;
        }
      }

      var value = this.computeProbabilityMap(
        map.value as ProbabilityMap<T, F>,
        ...customImplementationArgs
      );

      if (value) {
        // Increment the counter for this map
        this.probabilityMapCounter.set(
          map,
          this.probabilityMapCounter.get(map) + 1 || 1
        );
      }

      return value;
    }

    if (!map) {
      return false;
    }
    if (map === true || map === 1) {
      return true;
    }
    if (typeof map === "number") {
      return Math.random() < map;
    }

    if (typeof map === "function") {
      return (map as Function)(...customImplementationArgs);
    }

    if (typeof map === "string") {
      return map;
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
      var x = Number(percentages[key]);

      if (ticket >= count && ticket < count + x) {
        winner = key;
      }
      count += x;
    });

    return winner;
  }

  /**
   * Determines if a probability map can return a positive result (true, or some string mode).
   * - Negative probability maps are used to remove transformations from running entirely.
   * @param map
   */
  isProbabilityMapProbable<T>(map: ProbabilityMap<T>): boolean {
    ok(!Number.isNaN(map), "Numbers cannot be NaN");

    if (!map || typeof map === "undefined") {
      return false;
    }
    if (typeof map === "function") {
      return true;
    }
    if (typeof map === "number") {
      if (map > 1 || map < 0) {
        throw new Error(`Numbers must be between 0 and 1 for 0% - 100%`);
      }
    }
    if (Array.isArray(map)) {
      ok(
        map.length != 0,
        "Empty arrays are not allowed for options. Use false instead."
      );

      if (map.length == 1) {
        return !!map[0];
      }
    }
    if (typeof map === "object") {
      if (map instanceof Date) return true;
      if (map instanceof RegExp) return true;
      if ("value" in map && !map.value) return false;
      if ("limit" in map && map.limit === 0) return false;

      var keys = Object.keys(map);
      ok(
        keys.length != 0,
        "Empty objects are not allowed for options. Use false instead."
      );

      if (keys.length == 1) {
        return !!map[keys[0]];
      }
    }
    return true;
  }
}
