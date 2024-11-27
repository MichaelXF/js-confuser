import { MULTI_TRANSFORM, SKIP } from "../constants";
import Template from "./template";

/**
 * Hashing Algorithm for Integrity: `cyrb53`
 * @param str
 * @param seed
 */
export function HashFunction(str: string, seed: number) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// In template form to be inserted into code
export const HashTemplate = new Template(`
// Must be Function Declaration for hoisting
// Math.imul polyfill for ES5
function MathImulPolyfill(opA, opB){
  opB |= 0; // ensure that opB is an integer. opA will automatically be coerced.
  // floating points give us 53 bits of precision to work with plus 1 sign bit
  // automatically handled for our convienence:
  // 1. 0x003fffff /*opA & 0x000fffff*/ * 0x7fffffff /*opB*/ = 0x1fffff7fc00001
  //    0x1fffff7fc00001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
  var result = (opA & 0x003fffff) * opB;
  // 2. We can remove an integer coersion from the statement above because:
  //    0x1fffff7fc00001 + 0xffc00000 = 0x1fffffff800001
  //    0x1fffffff800001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
  if (opA & 0xffc00000 /*!== 0*/) result += (opA & 0xffc00000) * opB |0;
  return result |0;
};

var {imul} = Math["imul"] || MathImulPolyfill;

function {hashingUtilFnName}(str, seed) {
  var h1 = 0xdeadbeef ^ seed;
  var h2 = 0x41c6ce57 ^ seed;
  for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = {imul}(h1 ^ ch, 2654435761);
      h2 = {imul}(h2 ^ ch, 1597334677);
  }
  h1 = {imul}(h1 ^ (h1>>>16), 2246822507) ^ {imul}(h2 ^ (h2>>>13), 3266489909);
  h2 = {imul}(h2 ^ (h2>>>16), 2246822507) ^ {imul}(h1 ^ (h1>>>13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1>>>0);
};

// Simple function that returns .toString() value with spaces replaced out
function {name}(fnObject, seed, regex={sensitivityRegex}){
  var fnStringed = fnObject["toString"]()["replace"](regex, "");
  return {hashingUtilFnName}(fnStringed, seed);
}
`).addSymbols(SKIP, MULTI_TRANSFORM);
