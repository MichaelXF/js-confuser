import Template from "./template";

// Position-based cipher
export function xorEncodeString(str: string, key: number): string {
  var result = "";

  for (var i = 0; i < str.length; i++) {
    key = (key + 0x9e3779b9) | 0;
    var ks = (((key ^ (key >>> 13)) % 95) + 95) % 95;
    var normalized = str.charCodeAt(i) - 32;
    var shifted = (((normalized + ks) % 95) + 95) % 95;
    result += String.fromCharCode(shifted + 32);
  }

  return result;
}

export function xorDecodeString(str: string, key: number): string {
  var result = "";

  for (var i = 0; i < str.length; i++) {
    key = (key + 0x9e3779b9) | 0;
    var ks = (((key ^ (key >>> 13)) % 95) + 95) % 95;
    var normalized = str.charCodeAt(i) - 32;
    var shifted = (((normalized - ks) % 95) + 95) % 95;
    result += String.fromCharCode(shifted + 32);
  }

  return result;
}

export const xorDecodeStringTemplate =
  new Template(`function {fnName}(key, start, length) {

  for (var result = '', i = 0; i < length; i++) {
    key = (key + 0x9e3779b9) | 0;
    var ks = ((((key ^ (key >>> 13)) % 95) + 95) % 95);
    var normalized = {stringsName}["charCodeAt"](start + i) - 32;
    var shifted = (((normalized - ks) % 95) + 95) % 95;
    result += String.fromCharCode(shifted + 32);
  }

  return result;
}`);
