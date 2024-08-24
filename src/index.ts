import * as babelTypes from "@babel/types";
import Obfuscator from "./obfuscator";
import { ObfuscateOptions } from "./options";
import { ObfuscationResult, ProfilerCallback } from "./obfuscationResult";

export async function obfuscate(
  sourceCode: string,
  options: ObfuscateOptions
): Promise<ObfuscationResult> {
  var obfuscator = new Obfuscator(options);

  return obfuscator.obfuscate(sourceCode);
}

export async function obfuscateAST(
  ast: babelTypes.File,
  options: ObfuscateOptions
) {
  var obfuscator = new Obfuscator(options);

  return obfuscator.obfuscateAST(ast);
}

export async function obfuscateWithProfiler(
  sourceCode: string,
  options: ObfuscateOptions,
  profiler: {
    callback: ProfilerCallback;
    performance: { now(): number };
  }
): Promise<ObfuscationResult> {
  var obfuscator = new Obfuscator(options);

  var ast = obfuscator.parseCode(sourceCode);

  ast = obfuscator.obfuscateAST(ast, profiler.callback);

  var code = obfuscator.generateCode(ast);

  return {
    code: code,
  };
}

const JSConfuser = Object.assign(obfuscate, {
  obfuscate,
  obfuscateAST,
  obfuscateWithProfiler,
});

export default JSConfuser;
