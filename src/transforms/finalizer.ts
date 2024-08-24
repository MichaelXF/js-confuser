import { PluginObj } from "@babel/core";
import { PluginArg } from "./plugin";
import * as t from "@babel/types";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin("finalizer");

  return {
    visitor: {
      NumberLiteral: {
        exit(path) {
          if (me.options.hexadecimalNumbers) {
            const { value } = path.node;

            // Technically, a Literal will never be negative because it's supposed to be inside a UnaryExpression with a "-" operator.
            // This code handles it regardless
            var isNegative = value < 0;
            var hex = Math.abs(value).toString(16);

            var newStr = (isNegative ? "-" : "") + "0x" + hex;

            path.replaceWith(t.identifier(newStr));
            path.skip();
          }
        },
      },
    },
  };
};
