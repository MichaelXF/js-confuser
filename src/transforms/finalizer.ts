import { PluginArg, PluginObject } from "./plugin";
import * as t from "@babel/types";
import { Order } from "../order";
import stringEncoding from "./string/stringEncoding";
import { GEN_NODE, NodeSymbol, variableFunctionName } from "../constants";
import { ok } from "assert";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Finalizer);
  const stringEncodingPlugin = stringEncoding(me);

  return {
    visitor: {
      // String encoding
      ...stringEncodingPlugin.visitor,

      // Backup __JS_CONFUSER_VAR__ replacement
      // While done in Preparation, Rename Variables
      // This accounts for when Rename Variables is disabled and an inserted Template adds __JS_CONFUSER_VAR__ calls
      ...(me.obfuscator.hasPlugin(Order.RenameVariables)
        ? {}
        : {
            CallExpression: {
              exit(path) {
                if (
                  path.get("callee").isIdentifier({
                    name: variableFunctionName,
                  })
                ) {
                  var args = path.get("arguments");
                  ok(args.length === 1);

                  var arg = args[0];
                  ok(arg.isIdentifier());

                  var name = arg.node.name;
                  path.replaceWith(t.stringLiteral(name));
                }
              },
            },
          }),

      // Hexadecimal numbers
      NumericLiteral: {
        exit(path) {
          if (me.options.hexadecimalNumbers) {
            const { value } = path.node;

            if (
              Number.isNaN(value) ||
              !Number.isFinite(value) ||
              Math.floor(value) !== value
            ) {
              return;
            }

            // Technically, a Literal will never be negative because it's supposed to be inside a UnaryExpression with a "-" operator.
            // This code handles it regardless
            var isNegative = value < 0;
            var hex = Math.abs(value).toString(16);

            var newStr = (isNegative ? "-" : "") + "0x" + hex;

            var id = t.identifier(newStr);
            (id as NodeSymbol)[GEN_NODE] = true;

            path.replaceWith(id);
            path.skip();
          }
        },
      },
    },
  };
};
