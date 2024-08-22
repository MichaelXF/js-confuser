import Template from "../../templates/template";
import { Literal } from "../../util/gen";
import { choice, shuffle } from "../../util/random";

/**
 * Defines an encoding implementation the Obfuscator
 */
export interface EncodingImplementation {
  identity: string;

  encode(s: string): string;
  decode(s: string): string;
  template: Template;
}

let _hasAllEncodings = false;
export function hasAllEncodings() {
  return _hasAllEncodings;
}

export function createEncodingImplementation(): EncodingImplementation {
  if (_hasAllEncodings) {
    return EncodingImplementations[
      choice(Object.keys(EncodingImplementations))
    ];
  }

  // create base91 encoding
  let strTable =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';

  // shuffle table
  strTable = shuffle(strTable.split("")).join("");

  let identity = "base91_" + strTable;

  if (EncodingImplementations.hasOwnProperty(identity)) {
    _hasAllEncodings = true;
    return EncodingImplementations[identity];
  }

  var encodingImplementation = {
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
    template: new Template(`  
        function {__fnName__}(str){
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
  
          return {__bufferToString__}(ret);
        }
      `).setDefaultVariables({
      __strTable__: Literal(strTable),
    }),
  };

  EncodingImplementations[identity] = encodingImplementation;
  return encodingImplementation;
}

export const EncodingImplementations: {
  [encodingIdentity: string]: EncodingImplementation;
} = {
  /* ascii85: { This implementation is flaky and causes decoding errors 
    encode(a) {
      var b, c, d, e, f, g, h, i, j, k;
      // @ts-ignore
      for (
        // @ts-ignore
        !/[^\x00-\xFF]/.test(a),
          b = "\x00\x00\x00\x00".slice(a.length % 4 || 4),
          a += b,
          c = [],
          d = 0,
          e = a.length;
        e > d;
        d += 4
      )
        (f =
          (a.charCodeAt(d) << 24) +
          (a.charCodeAt(d + 1) << 16) +
          (a.charCodeAt(d + 2) << 8) +
          a.charCodeAt(d + 3)),
          0 !== f
            ? ((k = f % 85),
              (f = (f - k) / 85),
              (j = f % 85),
              (f = (f - j) / 85),
              (i = f % 85),
              (f = (f - i) / 85),
              (h = f % 85),
              (f = (f - h) / 85),
              (g = f % 85),
              c.push(g + 33, h + 33, i + 33, j + 33, k + 33))
            : c.push(122);
      return (
        (function (a, b) {
          for (var c = b; c > 0; c--) a.pop();
        })(c, b.length),
        "<~" + String.fromCharCode.apply(String, c) + "~>"
      );
    },
    decode(a) {
      var c,
        d,
        e,
        f,
        g,
        h = String,
        l = "length",
        w = 255,
        x = "charCodeAt",
        y = "slice",
        z = "replace";
      for (
        "<~" === a[y](0, 2) && "~>" === a[y](-2),
          a = a[y](2, -2)[z](/s/g, "")[z]("z", "!!!!!"),
          c = "uuuuu"[y](a[l] % 5 || 5),
          a += c,
          e = [],
          f = 0,
          g = a[l];
        g > f;
        f += 5
      )
        (d =
          52200625 * (a[x](f) - 33) +
          614125 * (a[x](f + 1) - 33) +
          7225 * (a[x](f + 2) - 33) +
          85 * (a[x](f + 3) - 33) +
          (a[x](f + 4) - 33)),
          e.push(w & (d >> 24), w & (d >> 16), w & (d >> 8), w & d);
      return (
        (function (a, b) {
          for (var c = b; c > 0; c--) a.pop();
        })(e, c[l]),
        h.fromCharCode.apply(h, e)
      );
    },
    template: Template(`
    function {name}(a, LL = ["fromCharCode", "apply"]) {
      var c, d, e, f, g, h = String, l = "length", w = 255, x = "charCodeAt", y = "slice", z = "replace";
      for ("<~" === a[y](0, 2) && "~>" === a[y](-2), a = a[y](2, -2)[z](/\s/g, "")[z]("z", "!!!!!"), 
      c = "uuuuu"[y](a[l] % 5 || 5), a += c, e = [], f = 0, g = a[l]; g > f; f += 5) d = 52200625 * (a[x](f) - 33) + 614125 * (a[x](f + 1) - 33) + 7225 * (a[x](f + 2) - 33) + 85 * (a[x](f + 3) - 33) + (a[x](f + 4) - 33), 
      e.push(w & d >> 24, w & d >> 16, w & d >> 8, w & d);
      return function(a, b) {
        for (var c = b; c > 0; c--) a.pop();
      }(e, c[l]), h[LL[0]][LL[1]](h, e);
    }
    `),
  }, */
};
