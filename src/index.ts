import * as babelTypes from "@babel/types";
import Obfuscator from "./obfuscator";
import { ObfuscateOptions } from "./options";
import {
  ObfuscationResult,
  ProfileData,
  ProfilerCallback,
  ProfilerLog,
} from "./obfuscationResult";
import presets from "./presets";
import Template from "./templates/template";

export async function obfuscate(
  sourceCode: string,
  options: ObfuscateOptions
): Promise<ObfuscationResult> {
  const obfuscator = new Obfuscator(options);

  return obfuscator.obfuscate(sourceCode);
}

export async function obfuscateAST(
  ast: babelTypes.File,
  options: ObfuscateOptions
) {
  const obfuscator = new Obfuscator(options);

  return obfuscator.obfuscateAST(ast);
}

export async function obfuscateWithProfiler(
  sourceCode: string,
  options: ObfuscateOptions,
  profiler: {
    callback?: ProfilerCallback;
    performance?: { now(): number };
  } = {}
): Promise<ObfuscationResult & { profileData: ProfileData }> {
  if (!profiler.performance) {
    profiler.performance = {
      now: () => Date.now(),
    };
  }

  const startTime = performance.now();

  const obfuscator = new Obfuscator(options);
  let totalTransforms = obfuscator.plugins.length;

  let transformMap: ProfileData["transforms"] = Object.create(null);

  const beforeParseTime = performance.now();

  let ast = Obfuscator.parseCode(sourceCode);

  const parseTime = performance.now() - beforeParseTime;

  let currentTransformTime = performance.now();

  ast = obfuscator.obfuscateAST(ast, {
    profiler: (log: ProfilerLog) => {
      var nowTime = performance.now();
      let entry = {
        transformTime: nowTime - currentTransformTime,
        changeData: {},
      };

      transformMap[log.currentTransform] = entry;

      // (JS-Confuser.com can run performance benchmark tests here)
      profiler.callback?.(log, entry, ast);

      // The profiler.callback() function may take a long time to execute,
      // so we need to update the currentTransformTime here for accurate profiling.
      currentTransformTime = performance.now();
    },
  });

  obfuscator.plugins.forEach(({ pluginInstance }) => {
    if (transformMap[pluginInstance.name]) {
      transformMap[pluginInstance.name].changeData = pluginInstance.changeData;
    }
  });

  const beforeCompileTime = performance.now();

  const code = Obfuscator.generateCode(ast, obfuscator.options);

  const compileTime = performance.now() - beforeCompileTime;

  const endTime = performance.now();

  const obfuscationTime = endTime - startTime;

  return {
    code: code,
    profileData: {
      transforms: transformMap,
      obfuscationTime: obfuscationTime,
      parseTime: parseTime,
      compileTime: compileTime,
      totalTransforms: totalTransforms,
      totalPossibleTransforms: obfuscator.totalPossibleTransforms,
    },
  };
}

const JsConfuser = {
  obfuscate,
  obfuscateAST,
  obfuscateWithProfiler,
  Obfuscator,
  presets,
  Template,
};

export default JsConfuser;
export { Obfuscator, presets, Template };
