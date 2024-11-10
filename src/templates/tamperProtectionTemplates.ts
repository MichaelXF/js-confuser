import { NodePath } from "@babel/traverse";
import { PluginInstance } from "../transforms/plugin";
import Template from "./template";
import {
  MULTI_TRANSFORM,
  placeholderVariablePrefix,
  UNSAFE,
} from "../constants";

export const StrictModeTemplate = new Template(`
  (function(){
    function isStrictMode(){
      try {
        var arr = []
        delete arr["length"]
      } catch(e) {
        return true;
      }
      return false;
    }

    if(isStrictMode()) {
      {countermeasures}
      {nativeFunctionName} = undefined;
    }
  })()
  `);

export const IndexOfTemplate = new Template(`
function indexOf(str, substr) {
  const len = str.length;
  const sublen = substr.length;
  let count = 0;

  if (sublen > len) {
    return -1;
  }

  for (let i = 0; i <= len - sublen; i++) {
    for (let j = 0; j < sublen; j++) {
      if (str[i + j] === substr[j]) {
        count++;
        if (count === sublen) {
          return i;
        }
      } else {
        count = 0;
        break;
      }
    }
  }

  return -1;
}
`);

export const NativeFunctionTemplate = new Template(`
function {nativeFunctionName}() {
  {IndexOfTemplate}

  function checkFunction(fn) {
    if (
      indexOf("" + fn, "{ [native code] }") === -1 ||
      typeof Object.getOwnPropertyDescriptor(fn, "toString") !== "undefined"
    ) {
      {countermeasures}

      return undefined;
    }

    return fn;
  }

  var args = arguments;
  if (args.length === 1) {
    return checkFunction(args[0]);
  } else if (args.length === 2) {
    var object = args[0];
    var property = args[1];

    var fn = object[property];
    fn = checkFunction(fn);

    return fn.bind(object);
  }
}`).addSymbols(UNSAFE, MULTI_TRANSFORM);

export const createEvalIntegrityTemplate = (
  pluginInstance: PluginInstance,
  path: NodePath
) => {
  if (pluginInstance.options.lock?.tamperProtection) {
    return new Template(`
      function {EvalIntegrityName}(){
        var localVar = false;
        eval(__JS_CONFUSER_VAR__(localVar) + " = true")

        if (!localVar) {
          // Eval was tampered!
          {countermeasures}

          return false;
        }

        return true;
      }
    `)
      .addSymbols(UNSAFE)
      .setDefaultVariables({
        countermeasures:
          pluginInstance.globalState.lock.createCountermeasuresCode(),
      });
  }

  return new Template(`
    function {EvalIntegrityName}(${placeholderVariablePrefix}_flag = true){
      return ${placeholderVariablePrefix}_flag;
    }
  `);
};
