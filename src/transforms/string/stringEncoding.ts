import Transform from "../transform";
import { choice } from "../../util/random";
import { isDirective } from "../../util/compare";
import { isModuleSource } from "./stringConcealing";
import { ComputeProbabilityMap } from "../../probability";
import { Identifier } from "../../util/gen";

function pad(x: string, len: number): string {
  while (x.length < len) {
    x = "0" + x;
  }
  return x;
}

function even(x: string) {
  if (x.length % 2 != 0) {
    return "0" + x;
  }
  return x;
}

function toHexRepresentation(str: string) {
  var escapedString = "";
  str.split("").forEach((char) => {
    var code = char.charCodeAt(0);
    if (code < 128) {
      escapedString += "\\x" + even(pad(code.toString(16), 2));
    } else {
      escapedString += char;
    }
  });

  return escapedString;
}

function toUnicodeRepresentation(str: string) {
  var escapedString = "";
  str.split("").forEach((char) => {
    var code = char.charCodeAt(0);
    if (code < 128) {
      escapedString += "\\u" + even(pad(code.toString(16), 4));
    } else {
      escapedString += char;
    }
  });

  return escapedString;
}

/**
 * [String Encoding](https://docs.jscrambler.com/code-integrity/documentation/transformations/string-encoding) transforms a string into an encoded representation.
 *
 * - Potency Low
 * - Resilience Low
 * - Cost Low
 */
export default class StringEncoding extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return (
      object.type == "Literal" &&
      typeof object.value === "string" &&
      object.value.length > 0 &&
      !isModuleSource(object, parents) &&
      !isDirective(object, parents)
    );
  }

  transform(object, parents) {
    // Allow percentages
    if (
      !ComputeProbabilityMap(
        this.options.stringEncoding,
        (x) => x,
        object.value
      )
    )
      return;

    var type = choice(["hexadecimal", "unicode"]);

    var escapedString = (
      type == "hexadecimal" ? toHexRepresentation : toUnicodeRepresentation
    )(object.value);

    return () => {
      if (object.type !== "Literal") return;

      // ESCodeGen tries to escape backslashes, here is a work-around
      this.replace(object, Identifier(`'${escapedString}'`));
    };
  }
}
