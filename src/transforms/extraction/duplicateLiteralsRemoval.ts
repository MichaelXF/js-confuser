import * as babel from "@babel/core";
import * as babelTypes from "@babel/types";
import { ok } from "assert";
import { PluginArg } from "../plugin";
import { Order } from "../../order";

type LiteralValue = string | number | boolean;
const createLiteral = (value: LiteralValue) => {
  switch (typeof value) {
    case "string":
      return babelTypes.stringLiteral(value);

    case "number":
      return babelTypes.numericLiteral(value);

    case "boolean":
      return babelTypes.booleanLiteral(value);
  }

  ok(false);
};

export default ({ Plugin }: PluginArg): babel.PluginObj => {
  const me = Plugin(Order.DuplicateLiteralsRemoval);

  return {
    visitor: {
      Program: {
        enter(programPath) {
          const arrayName = me.generateRandomIdentifier();

          // Collect all literals
          const literalsMap = new Map<LiteralValue, number>();
          const firstTimeMap = new Map<
            LiteralValue,
            babel.NodePath<babelTypes.Literal>
          >();

          const arrayExpression = babelTypes.arrayExpression([]);

          const createMemberExpression = (index) => {
            return babelTypes.memberExpression(
              babelTypes.identifier(arrayName),
              babelTypes.numericLiteral(index),
              true
            );
          };

          // Traverse through all nodes to find literals
          programPath.traverse({
            Literal(literalPath) {
              let node = literalPath.node;
              if (
                babelTypes.isNullLiteral(node) ||
                babelTypes.isRegExpLiteral(node) ||
                babelTypes.isTemplateLiteral(node)
              )
                return;
              const value = node.value;

              if (
                typeof value !== "string" &&
                typeof value !== "number" &&
                typeof value !== "boolean"
              ) {
                return;
              }

              var index = -1;

              if (literalsMap.has(value)) {
                index = literalsMap.get(value);
              } else if (firstTimeMap.has(value)) {
                // Create new index

                index = literalsMap.size;
                literalsMap.set(value, index);

                firstTimeMap
                  .get(value)
                  .replaceWith(createMemberExpression(index));

                arrayExpression.elements.push(createLiteral(value));
              } else {
                firstTimeMap.set(value, literalPath);

                return;
              }

              ok(index !== -1);

              // Replace literals in the code with a placeholder
              literalPath.replaceWith(createMemberExpression(index));
              literalPath.skip();
            },
          });

          if (arrayExpression.elements.length === 0) return;

          // Create the literals array declaration
          const itemsArrayDeclaration = babelTypes.variableDeclaration(
            "const",
            [
              babelTypes.variableDeclarator(
                babelTypes.identifier(arrayName),
                arrayExpression
              ),
            ]
          );

          // Insert the array at the top of the program body
          var path = programPath.unshiftContainer(
            "body",
            itemsArrayDeclaration
          )[0];

          programPath.scope.registerDeclaration(path);
          console.log(programPath.scope.bindings[arrayName].identifier);
        },
      },
    },
  };
};
