import * as babelTypes from "@babel/types";
import Obfuscator from "./obfuscator";
import { ObfuscateOptions } from "./options";
import {
  ObfuscationResult,
  ProfileData,
  ProfilerCallback,
  ProfilerLog,
} from "./obfuscationResult";

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
): Promise<ObfuscationResult & { profileData: ProfileData }> {
  const startTime = performance.now();

  var obfuscator = new Obfuscator(options);
  var totalTransforms = obfuscator.plugins.length;

  var transformTimeMap: { [transformName: string]: number } =
    Object.create(null);
  var currentTransformTime = performance.now();

  const beforeParseTime = performance.now();

  var ast = Obfuscator.parseCode(sourceCode);

  const parseTime = performance.now() - beforeParseTime;

  ast = obfuscator.obfuscateAST(ast, {
    profiler: (log: ProfilerLog) => {
      var nowTime = performance.now();
      transformTimeMap[log.currentTransform] = nowTime - currentTransformTime;
      currentTransformTime = nowTime;
      profiler.callback(log);
    },
  });

  const beforeCompileTime = performance.now();

  var code = Obfuscator.generateCode(ast, obfuscator.options);

  const compileTime = performance.now() - beforeCompileTime;

  const endTime = performance.now();

  const obfuscationTime = endTime - startTime;

  return {
    code: code,
    profileData: {
      transformTimeMap: transformTimeMap,
      obfuscationTime: obfuscationTime,
      parseTime: parseTime,
      compileTime: compileTime,
      totalTransforms: totalTransforms,
      totalPossibleTransforms: obfuscator.totalPossibleTransforms,
    },
  };
}

var oldJSConfuser = async (sourceCode: string, options: ObfuscateOptions) => {
  return (await obfuscate(sourceCode, options)).code;
};

const JSConfuser = Object.assign(oldJSConfuser, {
  obfuscate,
  obfuscateAST,
  obfuscateWithProfiler,
});

export default JSConfuser;
