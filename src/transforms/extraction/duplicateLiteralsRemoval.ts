import * as t from "@babel/types";
import { ok } from "assert";
import { PluginArg, PluginObject } from "../plugin";
import { Order } from "../../order";
import {
  ensureComputedExpression,
  isModuleImport,
  prepend,
} from "../../utils/ast-utils";
import { createLiteral, LiteralValue, numericLiteral } from "../../utils/node";
import { NodePath } from "@babel/traverse";

function fail(): never {
  throw new Error("Assertion failed");
}

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.DuplicateLiteralsRemoval, {
    changeData: {
      literals: 0,
    },
  });

  return {
    visitor: {
      Program: {
        enter(programPath) {
          const arrayName = me.getPlaceholder() + "_dlrArray";

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
              numericLiteral(index),
              true
            );
          };

          // Traverse through all nodes to find literals
          programPath.traverse({
            "StringLiteral|BooleanLiteral|NumericLiteral|NullLiteral|Identifier"(
              _path
            ) {
              const literalPath = _path as babel.NodePath<
                t.Literal | t.Identifier
              >;

              // Don't change module imports
              if (literalPath.isStringLiteral()) {
                if (isModuleImport(literalPath)) return;
              }

              let node = literalPath.node;
              var isUndefined = false;
              if (literalPath.isIdentifier()) {
                // Only referenced variable names
                if (!(literalPath as NodePath).isReferencedIdentifier()) return;

                // undefined = true; // Skip
                if ((literalPath as NodePath).isBindingIdentifier()) return;

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
              if (
                t.isRegExpLiteral(node) ||
                t.isTemplateLiteral(node) ||
                t.isDirectiveLiteral(node)
              )
                return;

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

                me.changeData.literals++;
                ensureComputedExpression(firstPath);

                firstPath.replaceWith(createMemberExpression(index));

                arrayExpression.elements.push(createLiteral(value));
              } else {
                firstTimeMap.set(value, literalPath);

                return;
              }

              ok(index !== -1);

              me.changeData.literals++;
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

          prepend(programPath, itemsArrayDeclaration);
        },
      },
    },
  };
};
