import { ObfuscateOptions } from "./options";
import * as babel from "@babel/core";
import generate from "@babel/generator";
import { PluginInstance } from "./transforms/plugin";
import { ok } from "assert";
import { applyDefaultsToOptions, validateOptions } from "./validateOptions";

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
import finalizer from "./transforms/finalizer";
import {
  ObfuscationResult,
  ProfilerCallback,
  ProfilerLog,
} from "./obfuscationResult";
import { isProbabilityMapProbable } from "./probability";

export default class Obfuscator {
  plugins: babel.PluginObj[] = [];
  options: ObfuscateOptions;

  totalPossibleTransforms: number = 0;

  public constructor(userOptions: ObfuscateOptions) {
    validateOptions(userOptions);
    this.options = applyDefaultsToOptions({ ...userOptions });

    const allPlugins = [];

    const push = (probabilityMap, ...pluginFns) => {
      this.totalPossibleTransforms += pluginFns.length;
      if (!isProbabilityMapProbable(probabilityMap)) return;

      allPlugins.push(...pluginFns);
    };

    push(true, preparation);
    push(this.options.deadCode, deadCode);

    push(this.options.dispatcher, dispatcher);
    push(this.options.duplicateLiteralsRemoval, duplicateLiteralsRemoval);
    push(this.options.objectExtraction, objectExtraction);
    push(this.options.globalConcealing, globalConcealing);
    push(this.options.variableMasking, variableMasking);
    push(this.options.renameVariables, renameVariables);
    push(this.options.stringCompression, stringCompression);
    push(this.options.stringSplitting, stringSplitting);
    push(this.options.shuffle, shuffle);

    push(true, finalizer);

    allPlugins.map((pluginFunction) => {
      var pluginInstance: PluginInstance;
      var plugin = pluginFunction({
        Plugin: (name) => {
          return (pluginInstance = new PluginInstance({ name }, this));
        },
      });

      ok(pluginInstance, "Plugin instance not created.");

      this.plugins.push(plugin);
    });
  }

  obfuscateAST(
    ast: babel.types.File,
    profiler?: ProfilerCallback
  ): babel.types.File {
    for (var i = 0; i < this.plugins.length; i++) {
      const plugin = this.plugins[i];
      babel.traverse(ast, plugin.visitor as babel.Visitor);

      if (profiler) {
        profiler({
          currentTransform: plugin.name,
          currentTransformNumber: i,
          nextTransform: this.plugins[i + 1]?.name,
          totalTransforms: this.plugins.length,
        });
      }
    }

    return ast;
  }

  async obfuscate(sourceCode: string): Promise<ObfuscationResult> {
    // Parse the source code into an AST
    let ast = this.parseCode(sourceCode);

    this.obfuscateAST(ast);

    // Generate the transformed code from the modified AST with comments removed and compacted output
    const code = this.generateCode(ast);

    if (code) {
      return {
        code: code,
      };
    } else {
      throw new Error("Failed to obfuscate the code.");
    }
  }

  generateCode(ast: babel.types.File): string {
    const { code } = generate(ast, {
      comments: false, // Remove comments
      compact: false, // Compact the output
    });

    return code;
  }

  parseCode(sourceCode: string): babel.types.File {
    // Parse the source code into an AST
    let ast = babel.parseSync(sourceCode, {
      sourceType: "unambiguous",
      babelrc: false,
      configFile: false,
    });

    return ast;
  }
}
