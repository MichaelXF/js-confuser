import { CustomStringEncoding } from "../../options";
import Template from "../../templates/template";
import { shuffle } from "../../utils/random-utils";
import * as t from "@babel/types";

let hasAllEncodings = false;

export function createDefaultStringEncoding(
  encodingImplementations
): CustomStringEncoding {
  if (hasAllEncodings) {
    return null;
  }

  // Create base91 encoding
  let strTable =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';

  // Randomize the charset
  strTable = shuffle(strTable.split("")).join("");

  let identity = "base91_" + strTable;

  // Check if the encoding already exists
  if (typeof encodingImplementations[identity] !== "undefined") {
    hasAllEncodings = true;
    return null;
  }

  var encodingImplementation: CustomStringEncoding = {
    identity,
    encode(str) {
      const table = strTable;

      const raw = Buffer.from(str, "utf-8");
      const len = raw.length;
      let ret = "";

      let n = 0;
      let b = 0;

      for (let i = 0; i < len; i++) {
        b |= raw[i] << n;
        n += 8;

        if (n > 13) {
          let v = b & 8191;
          if (v > 88) {
            b >>= 13;
            n -= 13;
          } else {
            v = b & 16383;
            b >>= 14;
            n -= 14;
          }
          ret += table[v % 91] + table[(v / 91) | 0];
        }
      }

      if (n) {
        ret += table[b % 91];
        if (n > 7 || b > 90) ret += table[(b / 91) | 0];
      }

      return ret;
    },
    decode(str) {
      const table = strTable;

      const raw = "" + (str || "");
      const len = raw.length;
      const ret = [];

      let b = 0;
      let n = 0;
      let v = -1;

      for (let i = 0; i < len; i++) {
        const p = table.indexOf(raw[i]);
        if (p === -1) continue;
        if (v < 0) {
          v = p;
        } else {
          v += p * 91;
          b |= v << n;
          n += (v & 8191) > 88 ? 13 : 14;
          do {
            ret.push(b & 0xff);
            b >>= 8;
            n -= 8;
          } while (n > 7);
          v = -1;
        }
      }

      if (v > -1) {
        ret.push((b | (v << n)) & 0xff);
      }

      return Buffer.from(ret).toString("utf-8");
    },
    code: new Template(`  
        function {fnName}(str){
          var table = {__strTable__};
  
          var raw = "" + (str || "");
          var len = raw.length;
          var ret = [];
  
          var b = 0;
          var n = 0;
          var v = -1;
  
          for (var i = 0; i < len; i++) {
            var p = table.indexOf(raw[i]);
            if (p === -1) continue;
            if (v < 0) {
              v = p;
            } else {
              v += p * 91;
              b |= v << n;
              n += (v & 8191) > 88 ? 13 : 14;
              do {
                ret.push(b & 0xff);
                b >>= 8;
                n -= 8;
              } while (n > 7);
              v = -1;
            }
          }
  
          if (v > -1) {
            ret.push((b | (v << n)) & 0xff);
          }
  
          return {__bufferToStringFunction__}(ret);
        }
      `).setDefaultVariables({
      __strTable__: t.stringLiteral(strTable),
    }),
  };

  return encodingImplementation;
}
