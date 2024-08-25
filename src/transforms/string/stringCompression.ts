import { PluginObj } from "@babel/core";
import { PluginArg } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.StringCompression);

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
                let index = stringMap.get(originalValue);
                if (typeof index === "undefined") {
                  index = stringMap.size;
                  stringMap.set(originalValue, index);
                }

                path.replaceWith(
                  t.callExpression(t.identifier(stringFn), [
                    t.numericLiteral(index),
                  ])
                );
              },
            },
          });

          // No strings changed
          if (stringMap.size === 0) return;

          // Create the string function
          var arrayExpression = t.arrayExpression(
            Array.from(stringMap.keys()).map((value) => t.stringLiteral(value))
          );

          var stringFunction = t.functionDeclaration(
            t.identifier(stringFn),
            [t.identifier("index")],
            t.blockStatement([
              t.returnStatement(
                t.memberExpression(arrayExpression, t.identifier("index"), true)
              ),
            ])
          );

          var p = programPath.unshiftContainer("body", stringFunction);
          programPath.scope.registerDeclaration(p[0]);
        },
      },
    },
  };
};
