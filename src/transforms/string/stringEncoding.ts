import { PluginObj } from "@babel/core";
import { PluginArg } from "../plugin";
import * as t from "@babel/types";
import { choice } from "../../utils/random-utils";
import { computeProbabilityMap } from "../../probability";
import { Order } from "../../order";

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

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Finalizer);

  return {
    visitor: {
      StringLiteral: {
        exit(path) {
          const { value } = path.node;

          // Allow percentages
          if (
            !computeProbabilityMap(me.options.stringEncoding, (x) => x, value)
          )
            return;

          var type = choice(["hexadecimal", "unicode"]);

          var escapedString = (
            type == "hexadecimal"
              ? toHexRepresentation
              : toUnicodeRepresentation
          )(value);

          path.replaceWith(t.identifier(`'${escapedString}'`));
          path.skip();
        },
      },
    },
  };
};
