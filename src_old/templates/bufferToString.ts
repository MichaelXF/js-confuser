import {
  placeholderVariablePrefix,
  predictableFunctionTag,
} from "../constants";
import Transform from "../transforms/transform";
import { Node } from "../util/gen";
import Template from "./template";

export const createGetGlobalTemplate = (
  transform: Transform,
  object: Node,
  parents: Node[]
) => {
  var options = transform.options;
  if (options.lock?.tamperProtection) {
    return new Template(`
      function {getGlobalFnName}(){
        var localVar = false;
        eval(${transform.jsConfuserVar("localVar")} + " = true")
        if (!localVar) {
          {countermeasures}
        }
    
        const root = eval("this");
        return root;
      }
    `).setDefaultVariables({
      countermeasures: transform.lockTransform.getCounterMeasuresCode(
        object,
        parents
      ),
    });
  }

  return GetGlobalTemplate;
};

const GetGlobalTemplate = new Template(`
  function ${placeholderVariablePrefix}CFG__getGlobalThis${predictableFunctionTag}(){
    return globalThis
  }

  function ${placeholderVariablePrefix}CFG__getGlobal${predictableFunctionTag}(){
    return global
  }

  function ${placeholderVariablePrefix}CFG__getWindow${predictableFunctionTag}(){
    return window
  }

  function ${placeholderVariablePrefix}CFG__getThisFunction${predictableFunctionTag}(){
    return new Function("return this")()
  }

  function {getGlobalFnName}(array = [
    ${placeholderVariablePrefix}CFG__getGlobalThis${predictableFunctionTag},
    ${placeholderVariablePrefix}CFG__getGlobal${predictableFunctionTag},
    ${placeholderVariablePrefix}CFG__getWindow${predictableFunctionTag},
    ${placeholderVariablePrefix}CFG__getThisFunction${predictableFunctionTag}
  ]){
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

export const BufferToStringTemplate = new Template(`
  {GetGlobalTemplate}

  var __globalObject = {getGlobalFnName}() || {};
  var __TextDecoder = __globalObject["TextDecoder"];
  var __Uint8Array = __globalObject["Uint8Array"];
  var __Buffer = __globalObject["Buffer"];
  var __String = __globalObject["String"] || String;
  var __Array = __globalObject["Array"] || Array;

  var utf8ArrayToStr = (function () {
    var charCache = new __Array(128);  // Preallocate the cache for the common single byte chars
    var charFromCodePt = __String["fromCodePoint"] || __String["fromCharCode"];
    var result = [];

    return function (array) {
        var codePt, byte1;
        var buffLen = array["length"];

        result["length"] = 0;

        for (var i = 0; i < buffLen;) {
            byte1 = array[i++];

            if (byte1 <= 0x7F) {
                codePt = byte1;
            } else if (byte1 <= 0xDF) {
                codePt = ((byte1 & 0x1F) << 6) | (array[i++] & 0x3F);
            } else if (byte1 <= 0xEF) {
                codePt = ((byte1 & 0x0F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
            } else if (__String["fromCodePoint"]) {
                codePt = ((byte1 & 0x07) << 18) | ((array[i++] & 0x3F) << 12) | ((array[i++] & 0x3F) << 6) | (array[i++] & 0x3F);
            } else {
                codePt = 63;    // Cannot convert four byte code points, so use "?" instead
                i += 3;
            }

            result["push"](charCache[codePt] || (charCache[codePt] = charFromCodePt(codePt)));
        }

        return result["join"]('');
    };
  })();

  function {name}(buffer){
    if(typeof __TextDecoder !== "undefined" && __TextDecoder) {
      return new __TextDecoder()["decode"](new __Uint8Array(buffer));
    } else if(typeof __Buffer !== "undefined" && __Buffer) {
      return __Buffer["from"](buffer)["toString"]("utf-8");
    } else {          
      return utf8ArrayToStr(buffer);
    }
  }
`);
