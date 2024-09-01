import { PluginObj } from "@babel/core";
import * as t from "@babel/types";
import { ok } from "assert";
import { PluginArg } from "../plugin";
import { Order } from "../../order";
import { ensureComputedExpression } from "../../utils/ast-utils";

function fail(): never {
  throw new Error("Assertion failed");
}

type LiteralValue = string | number | boolean | undefined | null;
const createLiteral = (value: LiteralValue) => {
  if (value === null) return t.nullLiteral();
  if (value === undefined) return t.identifier("undefined");

  switch (typeof value) {
    case "string":
      return t.stringLiteral(value);

    case "number":
      return t.numericLiteral(value);

    case "boolean":
      return t.booleanLiteral(value);
  }

  ok(false);
};

export default ({ Plugin }: PluginArg): PluginObj => {
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
            babel.NodePath<t.Literal | t.Identifier>
          >();

          const arrayExpression = t.arrayExpression([]);

          const createMemberExpression = (index) => {
            return t.memberExpression(
              t.identifier(arrayName),
              t.numericLiteral(index),
              true
            );
          };

          // Traverse through all nodes to find literals
          programPath.traverse({
            "Literal|Identifier"(_path) {
              const literalPath = _path as babel.NodePath<
                t.Literal | t.Identifier
              >;

              let node = literalPath.node;
              var isUndefined = false;
              if (literalPath.isIdentifier()) {
                // Allow 'undefined' to be redefined
                if (
                  literalPath.scope.hasBinding(literalPath.node.name, {
                    noGlobals: true,
                  })
                )
                  return;

                if (literalPath.node.name === "undefined") {
                  isUndefined = true;
                } else {
                  return;
                }
              }
              if (t.isRegExpLiteral(node) || t.isTemplateLiteral(node)) return;

              const value: LiteralValue = isUndefined
                ? undefined
                : t.isNullLiteral(node)
                ? null
                : t.isLiteral(node)
                ? node.value
                : fail();

              if (
                typeof value !== "string" &&
                typeof value !== "number" &&
                typeof value !== "boolean" &&
                value !== null &&
                value !== undefined
              ) {
                return;
              }

              // Skip empty strings
              if (typeof value === "string" && value.length === 0) return;

              var index = -1;

              if (literalsMap.has(value)) {
                index = literalsMap.get(value);
              } else if (firstTimeMap.has(value)) {
                // Create new index

                index = literalsMap.size;
                literalsMap.set(value, index);

                var firstPath = firstTimeMap.get(value);

                ensureComputedExpression(firstPath);

                firstPath.replaceWith(createMemberExpression(index));

                arrayExpression.elements.push(createLiteral(value));
              } else {
                firstTimeMap.set(value, literalPath);

                return;
              }

              ok(index !== -1);

              // Replace literals in the code with a placeholder
              ensureComputedExpression(literalPath);

              literalPath.replaceWith(createMemberExpression(index));
              literalPath.skip();
            },
          });

          if (arrayExpression.elements.length === 0) return;

          // Create the literals array declaration
          const itemsArrayDeclaration = t.variableDeclaration("const", [
            t.variableDeclarator(t.identifier(arrayName), arrayExpression),
          ]);

          // Insert the array at the top of the program body
          var path = programPath.unshiftContainer(
            "body",
            itemsArrayDeclaration
          )[0];

          programPath.scope.registerDeclaration(path);
        },
      },
    },
  };
};
