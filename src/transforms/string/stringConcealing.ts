import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import Template from "../../templates/template";
import { PluginArg } from "../plugin";
import { Order } from "../../order";
import { computeProbabilityMap } from "../../probability";
import {
  createEncodingImplementation,
  EncodingImplementation,
  hasAllEncodings,
} from "./encoding";
import { ok } from "assert";
import { BufferToStringTemplate } from "../../templates/bufferToStringTemplate";
import { createGetGlobalTemplate } from "../../templates/getGlobalTemplate";
import {
  ensureComputedExpression,
  isModuleImport,
} from "../../utils/ast-utils";
import {
  chance,
  getRandomInteger,
  getRandomString,
} from "../../utils/random-utils";

interface StringConcealingInterface {
  encodingImplementation: EncodingImplementation;
  fnName: string;
}

const STRING_CONCEALING = Symbol("StringConcealing");

interface NodeStringConcealing {
  [STRING_CONCEALING]?: StringConcealingInterface;
}

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.StringConcealing);

  const blocks: NodePath<t.Block>[] = [];
  const stringMap = new Map<string, number>();
  const stringArrayName = me.getPlaceholder() + "_array";

  return {
    visitor: {
      Program: {
        exit(programPath: NodePath<t.Program>) {
          let mainEncodingImplementation: EncodingImplementation;

          // Create a main encoder function for the Program
          (programPath.node as NodeStringConcealing)[STRING_CONCEALING] = {
            encodingImplementation: (mainEncodingImplementation =
              createEncodingImplementation()),
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
                  !computeProbabilityMap(
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
                    const encodingImplementation =
                      createEncodingImplementation();
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
                let index = stringMap.get(encodedValue);

                if (typeof index === "undefined") {
                  index = stringMap.size;
                  stringMap.set(encodedValue, index);
                }

                // Ensure the string is computed so we can replace it with complex call expression
                ensureComputedExpression(path);

                // Replace the string literal with a call to the decoder function
                path.replaceWith(
                  t.callExpression(
                    t.identifier(stringConcealingInterface.fnName),
                    [t.numericLiteral(index)]
                  )
                );

                // Skip the transformation for the newly created node
                path.skip();
              },
            },
          });

          const bufferToStringName = me.getPlaceholder() + "_bufferToString";
          const getGlobalFnName = me.getPlaceholder() + "_getGlobal";

          const bufferToString = BufferToStringTemplate.compile({
            GetGlobalTemplate: createGetGlobalTemplate(me, programPath),
            getGlobalFnName: getGlobalFnName,
            name: bufferToStringName,
          });

          programPath
            .unshiftContainer("body", bufferToString)
            .forEach((path) => {
              programPath.scope.registerDeclaration(path);
            });

          // Create the string array
          var stringArrayPath = programPath.unshiftContainer(
            "body",
            t.variableDeclaration("var", [
              t.variableDeclarator(
                t.identifier(stringArrayName),
                t.arrayExpression(
                  Array.from(stringMap.keys()).map((x) => t.stringLiteral(x))
                )
              ),
            ])
          )[0];
          programPath.scope.registerDeclaration(stringArrayPath);

          for (var block of blocks) {
            const { encodingImplementation, fnName } = (
              block.node as NodeStringConcealing
            )[STRING_CONCEALING] as StringConcealingInterface;

            const decodeFnName = fnName + "_d";

            // The decoder function
            const decoder = encodingImplementation.template.compile({
              __fnName__: decodeFnName,
              __bufferToStringFunction__: bufferToStringName,
            });

            // The main function to get the string value
            const retrieveFunctionDeclaration = new Template(`
              function ${fnName}(index) {
                return ${decodeFnName}(${stringArrayName}[index]);
              }
            `).single<t.FunctionDeclaration>();

            var newPath = block.unshiftContainer("body", [
              ...decoder,
              retrieveFunctionDeclaration,
            ])[0];
            block.scope.registerDeclaration(newPath);
            block.skip();
          }
        },
      },
    },
  };
};
