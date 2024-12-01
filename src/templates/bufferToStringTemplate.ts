import Template from "./template";

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
        var codePt;
        var byte1;
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

  function {BufferToString}(buffer){
    if(typeof __TextDecoder !== "undefined" && __TextDecoder) {
      return new __TextDecoder()["decode"](new __Uint8Array(buffer));
    } else if(typeof __Buffer !== "undefined" && __Buffer) {
      return __Buffer["from"](buffer)["toString"]("utf-8");
    } else {          
      return utf8ArrayToStr(buffer);
    }
  }
`);
