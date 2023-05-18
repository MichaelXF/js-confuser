import Transform from "./transform";
import { ObfuscateOrder } from "../order";
import { ExitCallback } from "../traverse";
import { Identifier, Node } from "../util/gen";

/**
 * The HexadecimalNumbers transformation converts number literals into the hexadecimal form.
 *
 * This is done by replacing the number literal with an Identifier to ensure escodegen properly outputs it as such
 *
 * This transformation also handles BigInt support, so its always enabled for this reason.
 */
export default class HexadecimalNumbers extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.HexadecimalNumbers);
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

  match(object: Node, parents: Node[]): boolean {
    return (
      (this.options.hexadecimalNumbers && this.isNumberLiteral(object)) ||
      this.isBigIntLiteral(object)
    );
  }

  transform(object: Node, parents: Node[]): void | ExitCallback {
    if (this.isNumberLiteral(object)) {
      return () => {
        // Technically, a Literal will never be negative because it's supposed to be inside a UnaryExpression with a "-" operator.
        // This code handles it regardless
        var isNegative = object.value < 0;
        var hex = Math.abs(object.value).toString(16);

        var newStr = (isNegative ? "-" : "") + "0x" + hex;

        this.replace(object, Identifier(newStr));
      };
    }

    // https://github.com/MichaelXF/js-confuser/issues/79
    if (this.isBigIntLiteral(object)) {
      return () => {
        // Use an Identifier with the raw string
        this.replace(object, Identifier(object.raw));
      };
    }
  }
}
