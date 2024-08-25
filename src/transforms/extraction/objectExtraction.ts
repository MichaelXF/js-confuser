import * as babelTypes from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import {
  getMemberExpressionPropertyAsString,
  getObjectPropertyAsString,
  isComputedMemberExpression,
} from "../../utils/ast-utils";
import { PluginArg } from "../plugin";
import { Order } from "../../order";
import { computeProbabilityMap } from "../../probability";

function isObjectSafeForExtraction(
  path: NodePath<babelTypes.VariableDeclarator>
): boolean {
  const id = path.node.id;
  babelTypes.assertIdentifier(id);
  const identifierName = id.name;

  const init = path.node.init;

  // Check if the object is not re-assigned
  const binding = path.scope.getBinding(identifierName);
  if (!binding || binding.constantViolations.length > 0) {
    return false;
  }

  var propertyNames = new Set<string>();

  // Check all properties of the object
  if (babelTypes.isObjectExpression(init)) {
    for (const prop of init.properties) {
      if (
        babelTypes.isObjectMethod(prop) ||
        babelTypes.isSpreadElement(prop) ||
        (babelTypes.isObjectProperty(prop) &&
          !babelTypes.isIdentifier(prop.key) &&
          !babelTypes.isStringLiteral(prop.key)) ||
        (babelTypes.isObjectProperty(prop) &&
          babelTypes.isFunctionExpression(prop.value) &&
          prop.value.body.body.some((node) =>
            babelTypes.isThisExpression(node)
          ))
      ) {
        return false;
      }

      var propertyKey = getObjectPropertyAsString(prop);
      if (typeof propertyKey !== "string") {
        return false;
      }
      propertyNames.add(propertyKey);
    }
  }

  // Check all references to ensure they are safe
  return binding.referencePaths.every((refPath) => {
    const parent = refPath.parent;

    // Referencing the object name by itself is not allowed
    if (!babelTypes.isMemberExpression(parent)) {
      return false;
    }

    if (babelTypes.isCallExpression(parent.property)) {
      return false;
    }

    var propertyName = getMemberExpressionPropertyAsString(parent);

    if (typeof propertyName !== "string") {
      return false;
    }
    return propertyNames.has(propertyName);
  });
}

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.ObjectExtraction);

  return {
    visitor: {
      VariableDeclarator(path: NodePath<babelTypes.VariableDeclarator>) {
        // Ensure the variable is an object literal and the object is not re-assigned
        if (
          babelTypes.isObjectExpression(path.node.init) &&
          path.node.id.type === "Identifier" &&
          isObjectSafeForExtraction(path)
        ) {
          const objectName = path.node.id.name;
          const properties = path.node.init.properties;

          // Extract each property and create a new variable for it
          const extractedVariables = properties
            .map((prop) => {
              if (
                babelTypes.isObjectProperty(prop) &&
                (babelTypes.isIdentifier(prop.key) ||
                  babelTypes.isStringLiteral(prop.key))
              ) {
                const propName = getObjectPropertyAsString(prop);

                const newVarName = `${objectName}_${propName}`;
                const newVarDeclaration = babelTypes.variableDeclarator(
                  babelTypes.identifier(newVarName),
                  prop.value as babelTypes.Expression
                );

                return newVarDeclaration;
              }

              return null;
            })
            .filter(Boolean);

          // Replace the original object with extracted variables
          if (extractedVariables.length > 0) {
            // Allow user to disable certain objects
            if (
              !computeProbabilityMap(
                me.options.objectExtraction,
                (x) => x,
                objectName
              )
            ) {
              return;
            }

            path.replaceWithMultiple(extractedVariables);

            var variableDeclaration =
              path.parent as babelTypes.VariableDeclaration;
            if (variableDeclaration.kind === "const") {
              variableDeclaration.kind = "let";
            }

            // Replace references to the object with the new variables
            path.scope.traverse(path.scope.block, {
              MemberExpression(
                memberPath: NodePath<babelTypes.MemberExpression>
              ) {
                const propName = getMemberExpressionPropertyAsString(
                  memberPath.node
                );

                const newVarName = `${objectName}_${propName}`;

                memberPath.replaceWith(babelTypes.identifier(newVarName));
              },
            });
          }
        }
      },
    },
  };
};
