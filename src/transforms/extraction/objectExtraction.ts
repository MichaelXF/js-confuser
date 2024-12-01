import { NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "../plugin";
import { Order } from "../../order";
import * as t from "@babel/types";
import {
  getMemberExpressionPropertyAsString,
  getObjectPropertyAsString,
  getParentFunctionOrProgram,
} from "../../utils/ast-utils";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.ObjectExtraction, {
    changeData: {
      objects: 0,
    },
  });

  return {
    visitor: {
      Program: {
        enter(path) {
          path.scope.crawl();
        },
      },
      VariableDeclaration(varDecPath) {
        if (varDecPath.node.declarations.length !== 1) return;
        const declaration = varDecPath.get(
          "declarations.0"
        ) as NodePath<t.VariableDeclarator>;

        // Must be simple variable declaration (No destructuring)
        const identifier = declaration.get("id");
        if (!identifier.isIdentifier()) return;

        // Must be an object expression
        const objectExpression = declaration.get("init");
        if (!objectExpression.isObjectExpression()) return;

        // Not allowed to reassign the object
        const binding = varDecPath.scope.getBinding(identifier.node.name);
        if (!binding || binding.constantViolations.length > 0) return;

        var pendingReplacements: {
          path: NodePath<t.MemberExpression>;
          replaceWith: t.Expression;
        }[] = [];

        const newObjectName = me.getPlaceholder() + "_" + identifier.node.name;
        const newPropertyMappings = new Map<string, string>();

        // Create new property names from the original object properties
        var newDeclarations: t.VariableDeclarator[] = [];
        for (var property of objectExpression.get("properties")) {
          if (!property.isObjectProperty()) return;
          const propertyKey = getObjectPropertyAsString(property.node);
          if (!propertyKey) {
            // Property key is not a static string, not allowed
            return;
          }

          let newPropertyName = newPropertyMappings.get(propertyKey);
          if (newPropertyName) {
            // Duplicate property, not allowed
            return;
          } else {
            newPropertyName =
              newObjectName +
              "_" +
              (t.isValidIdentifier(propertyKey)
                ? propertyKey
                : me.getPlaceholder());
            newPropertyMappings.set(propertyKey, newPropertyName);
          }

          // Check function for referencing 'this'
          const value = property.get("value");
          if (value.isFunction()) {
            var referencesThis = false;

            value.traverse({
              ThisExpression(thisPath) {
                referencesThis = true;
              },
            });

            if (referencesThis) {
              // Function references 'this', not allowed
              // When extracted, this will not refer to the original object
              return;
            }
          }

          newDeclarations.push(
            t.variableDeclarator(
              t.identifier(newPropertyName),
              value.node as t.Expression
            )
          );
        }

        var isObjectSafe = true;

        getParentFunctionOrProgram(varDecPath).traverse({
          Identifier: {
            exit(idPath) {
              if (idPath.node.name !== identifier.node.name) return;
              if (idPath === identifier) return; // Skip the original declaration

              const memberExpression = idPath.parentPath;
              if (!memberExpression || !memberExpression.isMemberExpression()) {
                isObjectSafe = false;
                return;
              }
              const property = getMemberExpressionPropertyAsString(
                memberExpression.node
              );
              if (!property) {
                isObjectSafe = false;
                return;
              }

              // Delete expression check
              if (
                memberExpression.parentPath.isUnaryExpression({
                  operator: "delete",
                })
              ) {
                // Deleting object properties is not allowed
                isObjectSafe = false;
                return;
              }

              let newPropertyName = newPropertyMappings.get(property);
              if (!newPropertyName) {
                // Property added later on, not allowed
                isObjectSafe = false;
                return;
              }

              const extractedIdentifier = t.identifier(newPropertyName);

              pendingReplacements.push({
                path: memberExpression,
                replaceWith: extractedIdentifier,
              });
            },
          },
        });

        // Object references are too complex to safely extract
        if (!isObjectSafe) return;

        if (
          !me.computeProbabilityMap(
            me.options.objectExtraction,
            identifier.node.name
          )
        )
          return;

        const newDeclarationKind =
          varDecPath.node.kind === "const" ? "let" : varDecPath.node.kind;

        varDecPath
          .replaceWithMultiple(
            newDeclarations.map((declaration) =>
              t.variableDeclaration(newDeclarationKind, [declaration])
            )
          )
          .forEach((path) => {
            // Make sure to register the new declarations
            path.scope.registerDeclaration(path);
          });

        // Replace all references to new singular identifiers
        for (const { path, replaceWith } of pendingReplacements) {
          path.replaceWith(replaceWith);
        }

        me.log("Extracted object", identifier.node.name);

        me.changeData.objects++;
      },
    },
  };
};
