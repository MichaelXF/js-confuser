import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";
import Template from "../../templates/template";
import { PluginArg, PluginObject } from "../plugin";
import { Order } from "../../order";
import { ok } from "assert";
import { BufferToStringTemplate } from "../../templates/bufferToStringTemplate";
import { createGetGlobalTemplate } from "../../templates/getGlobalTemplate";
import {
  ensureComputedExpression,
  isModuleImport,
  prepend,
  prependProgram,
} from "../../utils/ast-utils";
import {
  chance,
  choice,
  getRandomInteger,
  getRandomString,
} from "../../utils/random-utils";
import { CustomStringEncoding } from "../../options";
import { createDefaultStringEncoding } from "./encoding";
import { numericLiteral } from "../../utils/node";
import { NO_REMOVE } from "../../constants";

interface StringConcealingInterface {
  encodingImplementation: CustomStringEncoding;
  fnName: string;
}

const STRING_CONCEALING = Symbol("StringConcealing");

interface NodeStringConcealing {
  [STRING_CONCEALING]?: StringConcealingInterface;
}

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.StringConcealing, {
    changeData: {
      strings: 0,
      decryptionFunctions: 0,
    },
  });

  const blocks: NodePath<t.Block>[] = [];
  const stringMap = new Map<string, number>();
  const stringArrayName = me.getPlaceholder() + "_array";
  const stringArrayCacheName = me.getPlaceholder() + "_cache";

  let encodingImplementations: { [identity: string]: CustomStringEncoding } =
    Object.create(null);

  let availableStringEncodings = me.options.customStringEncodings;

  // If no custom encodings are provided, use the default encoding
  if (!availableStringEncodings || availableStringEncodings.length === 0) {
    availableStringEncodings = [createDefaultStringEncoding];
  }

  function hasAllEncodings() {
    return availableStringEncodings.length === 0;
  }

  function createStringEncoding(): CustomStringEncoding {
    var encodingIndex = getRandomInteger(0, availableStringEncodings.length);
    var encoding = availableStringEncodings[encodingIndex];

    if (typeof encoding === "function") {
      encoding = encoding(encodingImplementations);

      var duplicateIdentity =
        typeof encoding.identity !== "undefined" &&
        typeof encodingImplementations[encoding.identity] !== "undefined";

      if (duplicateIdentity || encoding === null) {
        // Null returned -> All encodings have been created
        // Duplicate identity -> Most likely all encodings have been created

        // No longer create new encodings using this function
        availableStringEncodings = availableStringEncodings.filter(
          (x) => x !== encoding
        );

        // Return a random encoding already made
        encoding = choice(Object.values(encodingImplementations));
        ok(encoding, "Failed to create main string encoding");
      }
    }

    if (typeof encoding.identity === "undefined") {
      encoding.identity = encodingIndex.toString();
    }

    if (typeof encoding.code === "string") {
      encoding.code = new Template(encoding.code);
    }

    me.changeData.decryptionFunctions++;
    encodingImplementations[encoding.identity] = encoding;

    return encoding;
  }

  return {
    visitor: {
      Program: {
        exit(programPath: NodePath<t.Program>) {
          let mainEncodingImplementation: CustomStringEncoding;

          // Create a main encoder function for the Program
          (programPath.node as NodeStringConcealing)[STRING_CONCEALING] = {
            encodingImplementation: (mainEncodingImplementation =
              createStringEncoding()),
            fnName: me.getPlaceholder() + "_MAIN_STR",
          };
          blocks.push(programPath);

          // Use that encoder function for these fake strings
          const fakeStringCount = getRandomInteger(75, 125);
          for (var i = 0; i < fakeStringCount; i++) {
            const fakeString = getRandomString(getRandomInteger(5, 50));
            stringMap.set(
              mainEncodingImplementation.encode(fakeString),
              stringMap.size
            );
          }

          programPath.traverse({
            StringLiteral: {
              exit(path: NodePath<t.StringLiteral>) {
                const originalValue = path.node.value;

                // Ignore require() calls / Import statements
                if (isModuleImport(path)) {
                  return;
                }

                // Minimum length of 3 characters
                if (originalValue.length < 3) {
                  return;
                }

                // Check user setting
                if (
                  !me.computeProbabilityMap(
                    me.options.stringConcealing,
                    originalValue
                  )
                ) {
                  return;
                }

                let block = path.findParent(
                  (p) =>
                    p.isBlock() &&
                    !!(p.node as NodeStringConcealing)?.[STRING_CONCEALING]
                ) as NodePath<t.Block>;

                let stringConcealingInterface = (
                  block?.node as NodeStringConcealing
                )?.[STRING_CONCEALING] as StringConcealingInterface;

                if (
                  !block ||
                  (!hasAllEncodings() && chance(75 - blocks.length))
                ) {
                  // Create a new encoder function
                  // Select random block parent (or Program)
                  block = path.findParent((p) =>
                    p.isBlock()
                  ) as NodePath<t.Block>;

                  const stringConcealingNode =
                    block.node as NodeStringConcealing;

                  // Ensure not to overwrite the previous encoders
                  if (!stringConcealingNode[STRING_CONCEALING]) {
                    // Create a new encoding function for this block
                    const encodingImplementation = createStringEncoding();
                    const fnName =
                      me.getPlaceholder() + "_STR_" + blocks.length;

                    stringConcealingInterface = {
                      encodingImplementation,
                      fnName: fnName,
                    };

                    // Save this info in the AST for future strings
                    stringConcealingNode[STRING_CONCEALING] =
                      stringConcealingInterface;

                    blocks.push(block);
                  }
                }

                ok(stringConcealingInterface);

                const encodedValue =
                  stringConcealingInterface.encodingImplementation.encode(
                    originalValue
                  );

                // If a decoder function is provided, use it to validate each encoded string
                if (
                  typeof stringConcealingInterface.encodingImplementation
                    .decode === "function"
                ) {
                  const decodedValue =
                    stringConcealingInterface.encodingImplementation.decode(
                      encodedValue
                    );
                  if (decodedValue !== originalValue) {
                    return;
                  }
                }

                let index = stringMap.get(encodedValue);

                if (typeof index === "undefined") {
                  index = stringMap.size;
                  stringMap.set(encodedValue, index);
                }

                me.changeData.strings++;

                // Ensure the string is computed so we can replace it with complex call expression
                ensureComputedExpression(path);

                // Replace the string literal with a call to the decoder function
                path.replaceWith(
                  t.callExpression(
                    t.identifier(stringConcealingInterface.fnName),
                    [numericLiteral(index)]
                  )
                );

                // Skip the transformation for the newly created node
                path.skip();
              },
            },
          });

          const bufferToStringName = me.getPlaceholder() + "_bufferToString";
          const getGlobalFnName = me.getPlaceholder() + "_getGlobal";

          const bufferToStringCode = BufferToStringTemplate.compile({
            GetGlobalTemplate: createGetGlobalTemplate(me, programPath),
            getGlobalFnName: getGlobalFnName,
            BufferToString: bufferToStringName,
          });

          prependProgram(programPath, bufferToStringCode);

          // Create the string array
          prependProgram(
            programPath,
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(stringArrayName),
                t.arrayExpression(
                  Array.from(stringMap.keys()).map((x) => t.stringLiteral(x))
                )
              ),
            ])
          );

          // Create the string cache
          prependProgram(
            programPath,
            new Template(`
            var {stringArrayCacheName} = {};
            `).single({
              stringArrayCacheName,
            })
          );

          for (var block of blocks) {
            const { encodingImplementation, fnName } = (
              block.node as NodeStringConcealing
            )[STRING_CONCEALING] as StringConcealingInterface;

            const decodeFnName = fnName + "_decode";

            ok(encodingImplementation.code instanceof Template);

            // The decoder function
            const decoder = encodingImplementation.code
              .addSymbols(NO_REMOVE)
              .compile({
                fnName: decodeFnName,
                __bufferToStringFunction__: bufferToStringName,
              });

            // The main function to get the string value
            const retrieveFunctionDeclaration = new Template(`
              function ${fnName}(index) {
                if (typeof ${stringArrayCacheName}[index] === 'undefined') {
                  return ${stringArrayCacheName}[index] = ${decodeFnName}(${stringArrayName}[index]);
                }
                return ${stringArrayCacheName}[index];
              }
            `)
              .addSymbols(NO_REMOVE)
              .single<t.FunctionDeclaration>();

            prepend(block, [...decoder, retrieveFunctionDeclaration]);
          }
        },
      },
    },
  };
};
