import Template from "./template.ts";

export function xorEncodeString(str: string, key: number): string {
  var result = "";
  var boundedKey = ((key % 95) + 95) % 95;

  for (var i = 0; i < str.length; i++) {
    var charCode = str.charCodeAt(i);
    var normalized = charCode - 32;
    var shifted = (normalized + boundedKey) % 95;
    result += String.fromCharCode(shifted + 32);
  }

  return result;
}

export function xorDecodeString(str: string, key: number): string {
  var result = "",
    boundedKey = ((key % 95) + 95) % 95;

  for (var i = 0; i < str.length; i++) {
    var charCode = str.charCodeAt(i);
    var normalized = charCode - 32;
    var shifted = (normalized - boundedKey + 95) % 95;
    result += String.fromCharCode(shifted + 32);
  }

  return result;
}

export const xorDecodeStringTemplate =
  new Template(`function {fnName}(str, key) {
  var result = '', boundedKey = ((key % 95) + 95) % 95;

  for (var i = 0; i < str.length; i++) {
    var charCode = str.charCodeAt(i);
    var normalized = charCode - 32;
    var shifted = (normalized - boundedKey + 95) % 95;
    result += String.fromCharCode(shifted + 32);
  }

  return result;
}`);
