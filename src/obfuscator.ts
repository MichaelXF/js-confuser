import { ok } from "assert";
import * as t from "@babel/types";
import generate from "@babel/generator";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import { ObfuscateOptions } from "./options";
import { applyDefaultsToOptions, validateOptions } from "./validateOptions";
import { ObfuscationResult, ProfilerCallback } from "./obfuscationResult";
import { isProbabilityMapProbable } from "./probability";
import { NameGen } from "./utils/NameGen";
import { Order } from "./order";
import {
  PluginFunction,
  PluginInstance,
  PluginObject,
} from "./transforms/plugin";

// Transforms
import preparation from "./transforms/preparation";
import renameVariables from "./transforms/identifier/renameVariables";
import variableMasking from "./transforms/variableMasking";
import dispatcher from "./transforms/dispatcher";
import duplicateLiteralsRemoval from "./transforms/extraction/duplicateLiteralsRemoval";
import objectExtraction from "./transforms/extraction/objectExtraction";
import functionOutlining from "./transforms/functionOutlining";
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
import pack from "./transforms/pack";

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
          isProbabilityMapProbable(this.options.lock[key])
      ).length > 0 ||
        this.options.lock.customLocks.length > 0);

    const allPlugins: PluginFunction[] = [];

    const push = (probabilityMap, ...pluginFns) => {
      this.totalPossibleTransforms += pluginFns.length;
      if (!isProbabilityMapProbable(probabilityMap)) return;

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
    push(this.options.functionOutlining, functionOutlining);
    push(this.options.stringSplitting, stringSplitting);
    push(this.options.stringConcealing, stringConcealing);
    push(this.options.stringCompression, stringCompression);
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
      disablePack?: boolean;
    }
  ): babel.types.File {
    let finalASTHandler: PluginObject["finalASTHandler"][] = [];

    for (let i = 0; i < this.plugins.length; i++) {
      this.index = i;
      const { plugin, pluginInstance } = this.plugins[i];

      // Skip pack if disabled
      if (pluginInstance.order === Order.Pack && options?.disablePack) continue;

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
}
