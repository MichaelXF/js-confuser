import { PluginArg, PluginObject } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";
import { computeProbabilityMap } from "../../probability";
import {
  ensureComputedExpression,
  prependProgram,
} from "../../utils/ast-utils";
import { numericLiteral } from "../../utils/node";
import {
  PakoInflateMin,
  StringCompressionTemplate,
} from "../../templates/stringCompressionTemplate";
import Obfuscator from "../../obfuscator";
import { createGetGlobalTemplate } from "../../templates/getGlobalTemplate";
import { NO_RENAME } from "../../constants";
const pako = require("pako");

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.StringCompression, {
    changeData: {
      strings: 0,
    },
  });

  const stringDelimiter = "|";

  return {
    visitor: {
      Program: {
        exit(programPath) {
          const stringFn = me.getPlaceholder() + "_SC";
          const stringMap = new Map<string, number>();

          // Find all the strings
          programPath.traverse({
            StringLiteral: {
              exit: (path) => {
                const originalValue = path.node.value;

                // Must be at least 3 characters long
                if (originalValue.length < 3) return;

                // Cannot contain the string delimiter
                if (originalValue.includes(stringDelimiter)) return;

                let index = stringMap.get(originalValue);
                if (typeof index === "undefined") {
                  // Allow user option to skip compression for certain strings
                  if (
                    !computeProbabilityMap(
                      me.options.stringCompression,
                      originalValue
                    )
                  ) {
                    return;
                  }

                  index = stringMap.size;
                  stringMap.set(originalValue, index);
                }

                me.changeData.strings++;

                ensureComputedExpression(path);

                path.replaceWith(
                  t.callExpression(t.identifier(stringFn), [
                    numericLiteral(index),
                  ])
                );
              },
            },
          });

          // No strings changed
          if (stringMap.size === 0) return;

          var stringPayload = Array.from(stringMap.keys()).join(
            stringDelimiter
          );

          // Compress the string
          var compressedBuffer: Uint8Array = pako.deflate(stringPayload);
          var compressedBase64 =
            Buffer.from(compressedBuffer).toString("base64");

          let pakoName = me.obfuscator.getStringCompressionLibraryName();
          let insertStringCompressionLibrary = !me.obfuscator.parentObfuscator;

          prependProgram(
            programPath,
            StringCompressionTemplate.compile({
              stringFn,
              stringName: me.getPlaceholder(),
              stringArray: me.getPlaceholder(),
              stringDelimiter: () => t.stringLiteral(stringDelimiter),
              stringValue: () => t.stringLiteral(compressedBase64),
              GetGlobalTemplate: createGetGlobalTemplate(me, programPath),
              getGlobalFnName: me.getPlaceholder(),
              pakoName: pakoName,
            })
          );

          if (insertStringCompressionLibrary) {
            // RGF function should also clone the entire decompression function
            prependProgram(
              programPath,
              Obfuscator.parseCode(PakoInflateMin.replace(/{pako}/g, pakoName))
                .program.body
            )[0]
              .get("declarations")[0]
              .get("id").node[NO_RENAME] = true;
          }
        },
      },
    },
  };
};
