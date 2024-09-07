import Template from "./template";

export const deadCodeTemplates = [
  new Template(`
    // Modified by bryanchow for namespace control and higher compressibility
// See https://gist.github.com/1649353 for full revision history from original

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2 Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 * Also http://anmar.eu.org/projects/jssha2/
 */

var sha256 = (function() {

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha256(s)    { return rstr2hex(rstr_sha256(str2rstr_utf8(s))); }
function b64_sha256(s)    { return rstr2b64(rstr_sha256(str2rstr_utf8(s))); }
function any_sha256(s, e) { return rstr2any(rstr_sha256(str2rstr_utf8(s)), e); }
function hex_hmac_sha256(k, d)
  { return rstr2hex(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_sha256(k, d)
  { return rstr2b64(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_sha256(k, d, e)
  { return rstr2any(rstr_hmac_sha256(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha256_vm_test()
{
  return hex_sha256("abc").toLowerCase() ==
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
}

/*
 * Calculate the sha256 of a raw string
 */
function rstr_sha256(s)
{
  return binb2rstr(binb_sha256(rstr2binb(s), s.length * 8));
}

/*
 * Calculate the HMAC-sha256 of a key and some data (raw strings)
 */
function rstr_hmac_sha256(key, data)
{
  var bkey = rstr2binb(key);
  if(bkey.length > 16) bkey = binb_sha256(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binb_sha256(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
  return binb2rstr(binb_sha256(opad.concat(hash), 512 + 256));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var remainders = Array();
  var i, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. We stop when the dividend is zero.
   * All remainders are stored for later use.
   */
  while(dividend.length > 0)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[remainders.length] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  /* Append leading zero equivalents */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)))
  for(i = output.length; i < full_length; i++)
    output = encoding[0] + output;

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of big-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binb(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
  return output;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
  return output;
}

/*
 * Main sha256 function, with its support functions
 */
function sha256_S (X, n) {return ( X >>> n ) | (X << (32 - n));}
function sha256_R (X, n) {return ( X >>> n );}
function sha256_Ch(x, y, z) {return ((x & y) ^ ((~x) & z));}
function sha256_Maj(x, y, z) {return ((x & y) ^ (x & z) ^ (y & z));}
function sha256_Sigma0256(x) {return (sha256_S(x, 2) ^ sha256_S(x, 13) ^ sha256_S(x, 22));}
function sha256_Sigma1256(x) {return (sha256_S(x, 6) ^ sha256_S(x, 11) ^ sha256_S(x, 25));}
function sha256_Gamma0256(x) {return (sha256_S(x, 7) ^ sha256_S(x, 18) ^ sha256_R(x, 3));}
function sha256_Gamma1256(x) {return (sha256_S(x, 17) ^ sha256_S(x, 19) ^ sha256_R(x, 10));}
function sha256_Sigma0512(x) {return (sha256_S(x, 28) ^ sha256_S(x, 34) ^ sha256_S(x, 39));}
function sha256_Sigma1512(x) {return (sha256_S(x, 14) ^ sha256_S(x, 18) ^ sha256_S(x, 41));}
function sha256_Gamma0512(x) {return (sha256_S(x, 1)  ^ sha256_S(x, 8) ^ sha256_R(x, 7));}
function sha256_Gamma1512(x) {return (sha256_S(x, 19) ^ sha256_S(x, 61) ^ sha256_R(x, 6));}

var sha256_K = new Array
(
  1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993,
  -1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987,
  1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522,
  264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
  -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585,
  113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
  1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885,
  -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344,
  430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
  1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872,
  -1866530822, -1538233109, -1090935817, -965641998
);

function binb_sha256(m, l)
{
  var HASH = new Array(1779033703, -1150833019, 1013904242, -1521486534,
                       1359893119, -1694144372, 528734635, 1541459225);
  var W = new Array(64);
  var a, b, c, d, e, f, g, h;
  var i, j, T1, T2;

  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;

  for(i = 0; i < m.length; i += 16)
  {
    a = HASH[0];
    b = HASH[1];
    c = HASH[2];
    d = HASH[3];
    e = HASH[4];
    f = HASH[5];
    g = HASH[6];
    h = HASH[7];

    for(j = 0; j < 64; j++)
    {
      if (j < 16) W[j] = m[j + i];
      else W[j] = safe_add(safe_add(safe_add(sha256_Gamma1256(W[j - 2]), W[j - 7]),
                                            sha256_Gamma0256(W[j - 15])), W[j - 16]);

      T1 = safe_add(safe_add(safe_add(safe_add(h, sha256_Sigma1256(e)), sha256_Ch(e, f, g)),
                                                          sha256_K[j]), W[j]);
      T2 = safe_add(sha256_Sigma0256(a), sha256_Maj(a, b, c));
      h = g;
      g = f;
      f = e;
      e = safe_add(d, T1);
      d = c;
      c = b;
      b = a;
      a = safe_add(T1, T2);
    }

    HASH[0] = safe_add(a, HASH[0]);
    HASH[1] = safe_add(b, HASH[1]);
    HASH[2] = safe_add(c, HASH[2]);
    HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]);
    HASH[5] = safe_add(f, HASH[5]);
    HASH[6] = safe_add(g, HASH[6]);
    HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
}

function safe_add (x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

return {
    hex: hex_sha256,
    b64: b64_hmac_sha256,
    any: any_hmac_sha256,
    hex_hmac: hex_hmac_sha256,
    b64_hmac: b64_hmac_sha256,
    any_hmac: any_hmac_sha256
};

}());

console.log(sha256)`),
  new Template(`
  /*! https://mths.be/utf8js v3.0.0 by @mathias */
;(function(root) {

	var stringFromCharCode = String.fromCharCode;

	// Taken from https://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from https://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	function checkScalarValue(codePoint) {
		if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
			throw Error(
				'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
				' is not a scalar value'
			);
		}
	}
	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			checkScalarValue(codePoint);
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8encode(string) {
		var codePoints = ucs2decode(string);
		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				checkScalarValue(codePoint);
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	root.version = '3.0.0';
	root.encode = utf8encode;
	root.decode = utf8decode;

}(typeof exports === 'undefined' ? this.utf8 = {} : exports));
  `),
  new Template(`
    const bigInt = require('big-integer');

class RSA {
  static randomPrime(bits) {
    const min = bigInt.one.shiftLeft(bits - 1);
    const max = bigInt.one.shiftLeft(bits).prev();
    
    while (true) {
      let p = bigInt.randBetween(min, max);
      if (p.isProbablePrime(256)) {
        return p;
      } 
    }
  }

  static generate(keysize) {
    const e = bigInt(65537);
    let p;
    let q;
    let totient;
  
    do {
      p = this.randomPrime(keysize / 2);
      q = this.randomPrime(keysize / 2);
      totient = bigInt.lcm(
        p.prev(),
        q.prev()
      );
    } while (bigInt.gcd(e, totient).notEquals(1) || p.minus(q).abs().shiftRight(keysize / 2 - 100).isZero());

    return {
      e, 
      n: p.multiply(q),
      d: e.modInv(totient),
    };
  }

  static encrypt(encodedMsg, n, e) {
    return bigInt(encodedMsg).modPow(e, n);
  }

  static decrypt(encryptedMsg, d, n) {
    return bigInt(encryptedMsg).modPow(d, n); 
  }

  static encode(str) {
    const codes = str
      .split('')
      .map(i => i.charCodeAt())
      .join('');

    return bigInt(codes);
  }

  static decode(code) {
    const stringified = code.toString();
    let string = '';

    for (let i = 0; i < stringified.length; i += 2) {
      let num = Number(stringified.substr(i, 2));
      
      if (num <= 30) {
        string += String.fromCharCode(Number(stringified.substr(i, 3)));
        i++;
      } else {
        string += String.fromCharCode(num);
      }
    }

    return string;
  }
}

module.exports = RSA;
    `),
  new Template(`
  function curCSS( elem, name, computed ) {
    var ret;
  
    computed = computed || getStyles( elem );
  
    if ( computed ) {
      ret = computed.getPropertyValue( name ) || computed[ name ];
  
      if ( ret === "" && !isAttached( elem ) ) {
        ret = redacted.style( elem, name );
      }
    }
  
    return ret !== undefined ?
  
      // Support: IE <=9 - 11+
      // IE returns zIndex value as an integer.
      ret + "" :
      ret;
  }`),
  new Template(`
  function Example() {
    var state = redacted.useState(false);
    return x(
      ErrorBoundary,
      null,
      x(
        DisplayName,
        null,
      )
    );
  }`),

  new Template(`
  const path = require('path');
const { version } = require('../../package');
const { version: dashboardPluginVersion } = require('@redacted/enterprise-plugin/package');
const { version: componentsVersion } = require('@redacted/components/package');
const { sdkVersion } = require('@redacted/enterprise-plugin');
const isStandaloneExecutable = require('../utils/isStandaloneExecutable');
const resolveLocalRedactedPath = require('./resolve-local-redacted-path');

const redactedPath = path.resolve(__dirname, '../redacted.js');`),

  new Template(`
module.exports = async (resolveLocalRedactedPath = ()=>{throw new Error("No redacted path provided")}) => {
  const cliParams = new Set(process.argv.slice(2));
  if (!cliParams.has('--version')) {
    if (cliParams.size !== 1) return false;
    if (!cliParams.has('-v')) return false;
  }

  const installationModePostfix = await (async (isStandaloneExecutable, redactedPath) => {
    if (isStandaloneExecutable) return ' (standalone)';
    if (redactedPath === (await resolveLocalRedactedPath())) return ' (local)';
    return '';
  })();

  return true;
};`),
  new Template(`
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}`),

  new Template(`function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}`),

  new Template(`function getLocalStorageValue(key, cb){
    if ( typeof key !== "string" ) {
      throw new Error("Invalid data key provided (not type string)")
    }
    if ( !key ) {
      throw new Error("Invalid data key provided (empty string)")
    }
    var value = window.localStorage.getItem(key)
    try {
      value = JSON.parse(value)
    } catch ( e ) {
      cb(new Error("Serialization error for data '" + key + "': " + e.message))
    }

    cb(null, value)
  }`),
  new Template(`
  
    var __ = "(c=ak(<~F$VU'9f)~><&85dBPL-module/from";
    var s = "q:function(){var ad=ad=>b(ad-29);if(!T.r[(typeof ab==ad(123)?";
    var g = "return U[c[c[d(-199)]-b(205)]]||V[ae(b(166))];case T.o[c[c[c[d(-199)]+d(-174)]-(c[b(119)]-(c[d(-199)]-163))]+ae(b(146))](0)==b(167)?d(-130):-d(-144)";

    __.match(s + g);
  `),
  new Template(`
  function vec_pack(vec) {
    return vec[1] * 67108864 + (vec[0] < 0 ? 33554432 | vec[0] : vec[0]);
  }
  
  function vec_unpack(number) {
    switch (((number & 33554432) !== 0) * 1 + (number < 0) * 2) {
      case 0:
        return [number % 33554432, Math.trunc(number / 67108864)];
      case 1:
        return [
          (number % 33554432) - 33554432,
          Math.trunc(number / 67108864) + 1,
        ];
      case 2:
        return [
          (((number + 33554432) % 33554432) + 33554432) % 33554432,
          Math.round(number / 67108864),
        ];
      case 3:
        return [number % 33554432, Math.trunc(number / 67108864)];
    }
  }
  
  let a = vec_pack([2, 4]);
  let b = vec_pack([1, 2]);
  
  let c = a + b; // Vector addition
  let d = c - b; // Vector subtraction
  let e = d * 2; // Scalar multiplication
  let f = e / 2; // Scalar division
  
  console.log(vec_unpack(c)); // [3, 6]
  console.log(vec_unpack(d)); // [2, 4]
  console.log(vec_unpack(e)); // [4, 8]
  console.log(vec_unpack(f)); // [2, 4]
  `),
  new Template(`
  function buildCharacterMap(str) {
    const characterMap = {};
  
    for (let char of str.replace(/[^\w]/g, "").toLowerCase())
      characterMap[char] = characterMap[char] + 1 || 1;
  
    return characterMap;
  }
  
  function isAnagrams(stringA, stringB) {
    const stringAMap = buildCharMap(stringA);
    const stringBMap = buildCharMap(stringB);
  
    for (let char in stringAMap) {
      if (stringAMap[char] !== stringBMap[char]) {
        return false;
      }
    }
  
    if (Object.keys(stringAMap).length !== Object.keys(stringBMap).length) {
      return false;
    }
  
    return true;
  }
  
  function isBalanced(root) {
    const height = getHeightBalanced(root);
    return height !== Infinity;
  }
  
  function getHeightBalanced(node) {
    if (!node) {
      return -1;
    }
  
    const leftTreeHeight = getHeightBalanced(node.left);
    const rightTreeHeight = getHeightBalanced(node.right);
  
    const heightDiff = Math.abs(leftTreeHeight - rightTreeHeight);
  
    if (
      leftTreeHeight === Infinity ||
      rightTreeHeight === Infinity ||
      heightDiff > 1
    ) {
      return Infinity;
    }
  
    const currentHeight = Math.max(leftTreeHeight, rightTreeHeight) + 1;
    return currentHeight;
  }
  
  window["__GLOBAL__HELPERS__"] = {
    buildCharacterMap,
    isAnagrams,
    isBalanced,
    getHeightBalanced,
  };
  `),
  new Template(`
  function ListNode(){}
  var addTwoNumbers = function(l1, l2) {
    var carry = 0;
    var sum = 0;
    var head = new ListNode(0);
    var now = head;
    var a = l1;
    var b = l2;
    while (a !== null || b !== null) {
      sum = (a ? a.val : 0) + (b ? b.val : 0) + carry;
      carry = Math.floor(sum / 10);
      now.next = new ListNode(sum % 10);
      now = now.next;
      a = a ? a.next : null;
      b = b ? b.next : null;
    }
    if (carry) now.next = new ListNode(carry);
    return head.next;
  };

  console.log(addTwoNumbers)
  `),
  new Template(`
  var threeSum = function(nums) {
    var len = nums.length;
    var res = [];
    var l = 0;
    var r = 0;
    nums.sort((a, b) => (a - b));
    for (var i = 0; i < len; i++) {
      if (i > 0 && nums[i] === nums[i - 1]) continue;
      l = i + 1;
      r = len - 1;
      while (l < r) {
        if (nums[i] + nums[l] + nums[r] < 0) {
          l++;
        } else if (nums[i] + nums[l] + nums[r] > 0) {
          r--;
        } else {
          res.push([nums[i], nums[l], nums[r]]);
          while (l < r && nums[l] === nums[l + 1]) l++;
          while (l < r && nums[r] === nums[r - 1]) r--;
          l++;
          r--;
        }
      }
    }
    return res;
  };
  console.log(threeSum)
  `),
  new Template(`
  var combinationSum2 = function(candidates, target) {
    var res = [];
    var len = candidates.length;
    candidates.sort((a, b) => (a - b));
    dfs(res, [], 0, len, candidates, target);
    return res;
  };

  var dfs = function (res, stack, index, len, candidates, target) {
    var tmp = null;
    if (target < 0) return;
    if (target === 0) return res.push(stack);
    for (var i = index; i < len; i++) {
      if (candidates[i] > target) break;
      if (i > index && candidates[i] === candidates[i - 1]) continue;
      tmp = Array.from(stack);
      tmp.push(candidates[i]);
      dfs(res, tmp, i + 1, len, candidates, target - candidates[i]);
    }
  };

  console.log(combinationSum2);
  `),
  new Template(`
  var isScramble = function(s1, s2) {
    return helper({}, s1, s2);
  };
  
  var helper = function (dp, s1, s2) {
    var map = {};
  
    if (dp[s1 + s2] !== undefined) return dp[s1 + s2];
    if (s1 === s2) return true;
  
    for (var j = 0; j < s1.length; j++) {
      if (map[s1[j]] === undefined) map[s1[j]] = 0;
      if (map[s2[j]] === undefined) map[s2[j]] = 0;
      map[s1[j]]++;
      map[s2[j]]--;
    }
  
    for (var key in map) {
      if (map[key] !== 0) {
        dp[s1 + s2] = false;
        return false;
      }
    }
  
    for (var i = 1; i < s1.length; i++) {
      if ((helper(dp, s1.substr(0, i), s2.substr(0, i))
           && helper(dp, s1.substr(i), s2.substr(i))) ||
          (helper(dp, s1.substr(0, i), s2.substr(s2.length - i))
           && helper(dp, s1.substr(i), s2.substr(0, s2.length - i)))) {
        dp[s1 + s2] = true;
        return true;
      }
    }
  
    dp[s1 + s2] = false;
    return false;
  };

  console.log(isScramble);
  `),
  new Template(`
  var candy = function(ratings) {
    var len = ratings.length;
    var res = [];
    var sum = 0;
    for (var i = 0; i < len; i++) {
      res.push((i !== 0 && ratings[i] > ratings[i - 1]) ? (res[i - 1] + 1) : 1);
    }
    for (var j = len - 1; j >= 0; j--) {
      if (j !== len - 1 && ratings[j] > ratings[j + 1]) res[j] = Math.max(res[j], res[j + 1] + 1);
      sum += res[j];
    }
    return sum;
  };
  
  console.log(candy)
  `),
  new Template(`
  var maxPoints = function(points) {
    var max = 0;
    var map = {};
    var localMax = 0;
    var samePoint = 0;
    var k = 0;
    var len = points.length;
    for (var i = 0; i < len; i++) {
      map = {};
      localMax = 0;
      samePoint = 1;
      for (var j = i + 1; j < len; j++) {
        if (points[i].x === points[j].x && points[i].y === points[j].y) {
          samePoint++;
          continue;
        }
          if (points[i].y === points[j].y) k = Number.MAX_SAFE_INTEGER;
          else k = (points[i].x - points[j].x) / (points[i].y - points[j].y);
          if (!map[k]) map[k] = 0;
          map[k]++;
          localMax = Math.max(localMax, map[k]);
      }
      localMax += samePoint;
      max = Math.max(max, localMax);
    }
    return max;
  };
  
  console.log(maxPoints)
  `),
  new Template(`
  var maximumGap = function(nums) {
    var len = nums.length;
    if (len < 2) return 0;
  
    var max = Math.max(...nums);
    var min = Math.min(...nums);
    if (max === min) return 0;
  
    var minBuckets = Array(len - 1).fill(Number.MAX_SAFE_INTEGER);
    var maxBuckets = Array(len - 1).fill(Number.MIN_SAFE_INTEGER);
    var gap = Math.ceil((max - min) / (len - 1));
    var index = 0;
    for (var i = 0; i < len; i++) {
      if (nums[i] === min || nums[i] === max) continue;
      index = Math.floor((nums[i] - min) / gap);
      minBuckets[index] = Math.min(minBuckets[index], nums[i]);
      maxBuckets[index] = Math.max(maxBuckets[index], nums[i]);
    }
  
    var maxGap = Number.MIN_SAFE_INTEGER;
    var preVal = min;
    for (var j = 0; j < len - 1; j++) {
      if (minBuckets[j] === Number.MAX_SAFE_INTEGER && maxBuckets[j] === Number.MIN_SAFE_INTEGER) continue;
      maxGap = Math.max(maxGap, minBuckets[j] - preVal);
      preVal = maxBuckets[j];
    }
    maxGap = Math.max(maxGap, max - preVal);
  
    return maxGap;
  };

  console.log(maximumGap);
  `),
  new Template(`
  var LRUCache = function(capacity) {
    this.capacity = capacity;
    this.length = 0;
    this.map = {};
    this.head = null;
    this.tail = null;
  };
  
  LRUCache.prototype.get = function(key) {
    var node = this.map[key];
    if (node) {
      this.remove(node);
      this.insert(node.key, node.val);
      return node.val;
    } else {
      return -1;
    }
  };
  
  LRUCache.prototype.put = function(key, value) {
    if (this.map[key]) {
      this.remove(this.map[key]);
      this.insert(key, value);
    } else {
      if (this.length === this.capacity) {
        this.remove(this.head);
        this.insert(key, value);
      } else {
        this.insert(key, value);
        this.length++;
      }
    }
  };
  
  /** 
   * Your LRUCache object will be instantiated and called as such:
   * var obj = Object.create(LRUCache).createNew(capacity)
   * var param_1 = obj.get(key)
   * obj.put(key,value)
   */
  
  LRUCache.prototype.remove = function (node) {
    var prev = node.prev;
    var next = node.next;
    if (next) next.prev = prev;
    if (prev) prev.next = next;
    if (this.head === node) this.head = next;
    if (this.tail === node) this.tail = prev;
    delete this.map[node.key];
  };
  
  LRUCache.prototype.insert = function (key, val) {
    var node = new List(key, val);
    if (!this.tail) {
      this.tail = node;
      this.head = node;
    } else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    this.map[key] = node;
  };

  console.log(LRUCache);
  `),
  new Template(`
  var isInterleave = function(s1, s2, s3) {
    var dp = {};
    if (s3.length !== s1.length + s2.length) return false;
    return helper(s1, s2, s3, 0, 0, 0, dp);
  };
  
  var helper = function (s1, s2, s3, i, j, k, dp) {
    var res = false;
  
    if (k >= s3.length) return true;
    if (dp['' + i + j + k] !== undefined) return dp['' + i + j + k];
  
    if (s3[k] === s1[i] && s3[k] === s2[j]) {
      res = helper(s1, s2, s3, i + 1, j, k + 1, dp) || helper(s1, s2, s3, i, j + 1, k + 1, dp);
    } else if (s3[k] === s1[i]) {
      res = helper(s1, s2, s3, i + 1, j, k + 1, dp);
    } else if (s3[k] === s2[j]) {
      res = helper(s1, s2, s3, i, j + 1, k + 1, dp);
    }
  
    dp['' + i + j + k] = res;
  
    return res;
  };

  console.log(isInterleave);
  `),
  new Template(`
  var solveNQueens = function(n) {
    var res = [];
    if (n === 1 || n >= 4) dfs(res, [], n, 0);
    return res;
  };
  
  var dfs = function (res, points, n, index) {
    for (var i = index; i < n; i++) {
      if (points.length !== i) return;
      for (var j = 0; j < n; j++) {
        if (isValid(points, [i, j])) {
          points.push([i, j]);
          dfs(res, points, n, i + 1);
          if (points.length === n) res.push(buildRes(points));
          points.pop();
        }
      }
    }
  };
  
  var buildRes = function (points) {
    var res = [];
    var n = points.length;
    for (var i = 0; i < n; i++) {
      res[i] = '';
      for (var j = 0; j < n; j++) {
        res[i] += (points[i][1] === j ? 'Q' : '.');
      }
    }
    return res;
  };
  
  var isValid = function (oldPoints, newPoint) {
    var len = oldPoints.length;
    for (var i = 0; i < len; i++) {
      if (oldPoints[i][0] === newPoint[0] || oldPoints[i][1] === newPoint[1]) return false;
      if (Math.abs((oldPoints[i][0] - newPoint[0]) / (oldPoints[i][1] - newPoint[1])) === 1) return false;
    }
    return true;
  };

  console.log(solveNQueens);
  `),
];
