import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import { ExitCallback } from "../traverse";
import { Identifier, Node } from "../util/gen";
import { chance, choice } from "../util/random";
import StringEncoding from "./string/stringEncoding";
import Transform from "./transform";

var zeroExpressions = ["!1", "[]", '""'];
var oneExpressions = ["!0", "!+{}", "!+[]"];

/**
 * The Finalizer is the last transformation before the code is ready to be generated.
 *
 * Numbers:
 * - Convert number literals into `Identifier` nodes with the name being a math expression
 *
 * BigInt support:
 * - Convert BigInt literals into `Identifier` nodes with the name being the raw BigInt string value + "n"
 *
 * String Encoding:
 * - Convert String literals into `Identifier` nodes with the name being a unicode escaped string
 */
export default class Finalizer extends Transform {
  stringEncoding: StringEncoding;

  constructor(o) {
    super(o, ObfuscateOrder.Finalizer);

    this.stringEncoding = new StringEncoding(o);
  }

  isNumberLiteral(object: Node) {
    return (
      object.type === "Literal" &&
      typeof object.value === "number" &&
      Math.floor(object.value) === object.value
    );
  }

  isBigIntLiteral(object: Node) {
    return object.type === "Literal" && typeof object.value === "bigint";
  }

  match(object, parents) {
    return object.type === "Literal";
  }

  encodeNumber(value: number): string {
    // Special notations for -1, 0 and 1, very small/simple jsfuck
    if([-1, 0, 1].includes(value)) {
      return (
        value === -1 ? "-" + choice(oneExpressions) // -!0 == -1
        : value === 0 ? choice(["+", "-"]) + choice(zeroExpressions) // +!1 == 0
        : Math.random() > 0.5 ? "+" + choice(oneExpressions) // +1!0 == 1
        : "-~" + choice(zeroExpressions) // -~!1 == 0
      )
    }

    if(value === Math.floor(value)) {
      if(value > 0 && value < 1024 && chance(5))
        return "0b" + value.toString(2);
      var hex = Math.abs(value).toString(16);
      if(this.isHexadecimalAcceptable(hex))
        return (value >= 0 ? "" : "-") + "0x" + Math.abs(value).toString(16);
    }
    
    if(Math.abs(value) < 0xffff_ffff_ffff) {
      var digits = Math.floor(Math.random() * 10) - 5;
      if(digits >= 0) digits++; // disallow 0 without giving any bias
      var encoded = (value * Math.pow(10, -digits)).toString() + choice(["e", "E"]) + digits;
      if(parseFloat(encoded) !== value) { // dont lose precision
        digits = -digits;
        encoded = (value * Math.pow(10, -digits)).toString() + choice(["e", "E"]) + digits;
        if(parseFloat(encoded) === value)
          return encoded;
      } else
        return encoded;
    }

    return value.toString();
  }

  isHexadecimalAcceptable(hex: string): boolean {
    // for some numbers, the hexadecimal representation makes it more readable
    // for example: colors (0xff0000 - red), limits (0xffff - max uint16)
    // this is a simple heuristic that will "guess" if the hexadecimal
    // representation could have a meaning
    // for 32bit numbers, 2 digit group in a row is the limit
    // for anything bigger, the limit is 3 digit groups in a row
    return !(hex.length > 8 ? /(.+)\1{2}/.test(hex) : /(.+)\1/.test(hex));
  }

  transform(object: Node, parents: Node[]): void | ExitCallback {
    // Conceal numbers
    if (ComputeProbabilityMap(this.options.numberConcealing) && ["number", "bigint"].includes(typeof object.value)) {
      return () => {
        // console.log(object, parents)
        var newStr: string;
        if(this.isBigIntLiteral(object)) {
          var isNegative = object.value < 0;
          var abs = isNegative ? -object.value : object.value;
          var hex = abs.toString(16);
          newStr = (
            (isNegative ? "-" : "")
            + (this.isHexadecimalAcceptable(hex) ? "0x" + hex : object.value.toString(10))
            + "n"
          );
        }
        // convert number to math expression for whole numbers up to 48bit
        else if(Math.abs(object.value) < 0xffff_ffff_ffff && Math.floor(object.value) === object.value) {
          var lower = isNegative ? object.value - 32768 : 0;
          var upper = isNegative ? 0 : object.value + 32768;
  
          var part1 = Math.floor(Math.random() * (upper - lower) + lower);
          var operator = choice(["+", "-", "^"]);
          var part2 = (
            operator === "+" ? object.value - part1
            : operator === "-" ? object.value + part1
            : part1 ^ object.value
          )
          newStr = `(${this.encodeNumber(part2)} ${operator} ${this.encodeNumber(part1)})`;
        } else {
          newStr = this.encodeNumber(object.value);
        }

        // need to wrap () in [] in definitions like { 1: 1 }
        if(parents[0].key === object && newStr.startsWith("("))
          newStr = `[${newStr.substring(1, newStr.length - 1)}]`;

        // console.log(object, newStr)
        this.replace(object, Identifier(newStr));
      };
    }

    // BigInt support
    if (this.isBigIntLiteral(object)) {
      // https://github.com/MichaelXF/js-confuser/issues/79
      return () => {
        // Use an Identifier with the raw string
        this.replace(object, Identifier(object.raw));
      }
    }

    if (
      this.options.stringEncoding &&
      this.stringEncoding.match(object, parents)
    ) {
      return this.stringEncoding.transform(object, parents);
    }
  }
}
