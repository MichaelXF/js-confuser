import { ObfuscateOrder } from "../order";
import { ExitCallback } from "../traverse";
import { Identifier, Node } from "../util/gen";
import StringEncoding from "./string/stringEncoding";
import Transform from "./transform";

/**
 * The Finalizer is the last transformation before the code is ready to be generated.
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

  isBigIntLiteral(object: Node) {
    return object.type === "Literal" && typeof object.value === "bigint";
  }

  match(object, parents) {
    return object.type === "Literal";
  }

  transform(object: Node, parents: Node[]): void | ExitCallback {
    // BigInt support
    if (this.isBigIntLiteral(object)) {
      // https://github.com/MichaelXF/js-confuser/issues/79
      return () => {
        // Use an Identifier with the raw string
        this.replace(object, Identifier(object.raw));
      };
    }

    if (
      this.options.stringEncoding &&
      this.stringEncoding.match(object, parents)
    ) {
      return this.stringEncoding.transform(object, parents);
    }
  }
}
