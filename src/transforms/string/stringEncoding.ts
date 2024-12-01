import { PluginInstance, PluginObject } from "../plugin";
import * as t from "@babel/types";
import { choice } from "../../utils/random-utils";
import { GEN_NODE, NodeSymbol } from "../../constants";
import { isModuleImport } from "../../utils/ast-utils";

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

export default (me: PluginInstance): PluginObject => {
  return {
    visitor: {
      StringLiteral: {
        exit(path) {
          // Ignore module imports
          if (isModuleImport(path)) return;

          const { value } = path.node;

          // Allow percentages
          if (!me.computeProbabilityMap(me.options.stringEncoding, value))
            return;

          var type = choice(["hexadecimal", "unicode"]);

          var escapedString = (
            type == "hexadecimal"
              ? toHexRepresentation
              : toUnicodeRepresentation
          )(value);

          var id = t.identifier(`"${escapedString}"`);

          (id as NodeSymbol)[GEN_NODE] = true;
          path.replaceWith(id);
          path.skip();
        },
      },
    },
  };
};
