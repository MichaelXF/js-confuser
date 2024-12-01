import { PluginArg, PluginObject } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";
import {
  ensureComputedExpression,
  isModuleImport,
  prependProgram,
} from "../../utils/ast-utils";
import { numericLiteral } from "../../utils/node";
import {
  StringCompressionLibraryMinified,
  StringCompressionTemplate,
} from "../../templates/stringCompressionTemplate";
import Obfuscator from "../../obfuscator";
import { createGetGlobalTemplate } from "../../templates/getGlobalTemplate";
import { NO_RENAME } from "../../constants";
const LZString = require("lz-string");

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.StringCompression, {
    changeData: {
      strings: 0,
    },
  });

  // String Compression is only applied to the main obfuscator
  // Any RGF functions will not have string compression due to the size of the decompression function

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
                // Don't change module imports
                if (isModuleImport(path)) return;

                const originalValue = path.node.value;

                // Must be at least 3 characters long
                if (originalValue.length < 3) return;

                // Cannot contain the string delimiter
                if (originalValue.includes(stringDelimiter)) return;

                let index = stringMap.get(originalValue);
                if (typeof index === "undefined") {
                  // Allow user option to skip compression for certain strings
                  if (
                    !me.computeProbabilityMap(
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
          var compressedString = LZString.compressToUTF16(stringPayload);

          let stringCompressionLibraryName =
            me.obfuscator.getStringCompressionLibraryName();
          let insertStringCompressionLibrary = !me.obfuscator.parentObfuscator;

          prependProgram(
            programPath,
            StringCompressionTemplate.compile({
              stringFn,
              stringName: me.getPlaceholder(),
              stringArray: me.getPlaceholder(),
              stringDelimiter: () => t.stringLiteral(stringDelimiter),
              stringValue: () => t.stringLiteral(compressedString),
              GetGlobalTemplate: createGetGlobalTemplate(me, programPath),
              getGlobalFnName: me.getPlaceholder(),
              StringCompressionLibrary: stringCompressionLibraryName,
            })
          );

          if (insertStringCompressionLibrary) {
            // RGF functions should not clone the entire decompression function
            prependProgram(
              programPath,
              Obfuscator.parseCode(
                StringCompressionLibraryMinified.replace(
                  /{StringCompressionLibrary}/g,
                  stringCompressionLibraryName
                )
              ).program.body
            )[0]
              .get("declarations")[0]
              .get("id").node[NO_RENAME] = true;
          }
        },
      },
    },
  };
};
