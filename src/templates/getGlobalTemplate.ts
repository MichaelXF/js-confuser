import { NodePath } from "@babel/traverse";
import { PluginInstance } from "../transforms/plugin";
import Template from "./template";
import { UNSAFE } from "../constants";
import { isStrictMode } from "../utils/ast-utils";

export const createGetGlobalTemplate = (
  pluginInstance: PluginInstance,
  path: NodePath
) => {
  if (
    pluginInstance.options.lock?.tamperProtection &&
    !path.find((p) => isStrictMode(p))
  ) {
    return new Template(`
      function {getGlobalFnName}(){
        var localVar = false;
        eval(__JS_CONFUSER_VAR__(localVar) + " = true")
        if (!localVar) {
          {countermeasures}

          return {};
        }

        const root = eval("this");
        return root;
      }
    `)
      .addSymbols(UNSAFE)
      .setDefaultVariables({
        countermeasures:
          pluginInstance.globalState.lock.createCountermeasuresCode(),
      });
  }

  return GetGlobalTemplate;
};

const GetGlobalTemplate = new Template(`
  function {getGlobalFnName}(){
    var array = [
      function (){
        return globalThis
      },
      function (){
        return global
      },
      function (){
        return window
      },
      function (){
        return new Function("return this")()
      }
    ];

    var bestMatch
    var itemsToSearch = []
    try {
      bestMatch = Object
      itemsToSearch["push"](("")["__proto__"]["constructor"]["name"])
    } catch(e) {

    }
    A: for(var i = 0; i < array["length"]; i++) {
      try {
        bestMatch = array[i]()
        for(var j = 0; j < itemsToSearch["length"]; j++) {
          if(typeof bestMatch[itemsToSearch[j]] === "undefined") continue A;
        }
        return bestMatch
      } catch(e) {}
    }

		return bestMatch || this;
  }
`);
