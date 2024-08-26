import { NodePath } from "@babel/traverse";
import { PluginInstance } from "../transforms/plugin";
import Template from "./template";

export const createGetGlobalTemplate = (
  pluginInstance: PluginInstance,
  path: NodePath
) => {
  var options = pluginInstance.options;
  // if (options.lock?.tamperProtection) {
  //   return new Template(`
  //     function {getGlobalFnName}(){
  //       var localVar = false;
  //       eval(${transform.jsConfuserVar("localVar")} + " = true")
  //       if (!localVar) {
  //         {countermeasures}
  //       }

  //       const root = eval("this");
  //       return root;
  //     }
  //   `).setDefaultVariables({
  //     countermeasures: transform.lockTransform.getCounterMeasuresCode(
  //       object,
  //       parents
  //     ),
  //   });
  // }

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
