import * as babelTypes from "@babel/types";
import { NodePath } from "@babel/core";

export function insertIntoNearestBlockScope(
  path: NodePath,
  ...nodesToInsert: babelTypes.Statement[]
): NodePath[] {
  // Traverse up the AST until we find a BlockStatement or Program
  let targetPath: NodePath = path;

  while (targetPath && !babelTypes.isProgram(targetPath.node)) {
    targetPath = targetPath.parentPath;
  }

  // Ensure that we found a valid insertion point
  if (babelTypes.isBlockStatement(targetPath.node)) {
    // Insert before the current statement within the found block
    return targetPath.insertBefore(nodesToInsert) as NodePath[];
  } else if (targetPath.isProgram()) {
    // Insert at the top of the program body
    return targetPath.unshiftContainer("body", nodesToInsert) as NodePath[];
  } else {
    throw new Error(
      "Could not find a suitable block scope to insert the nodes."
    );
  }
}

export function isReservedIdentifier(
  node: babelTypes.Identifier | babelTypes.JSXIdentifier
): boolean {
  return (
    node.name === "arguments" || // Check for 'arguments'
    node.name === "undefined" || // Check for 'undefined'
    node.name === "NaN" || // Check for 'NaN'
    node.name === "Infinity" || // Check for 'Infinity'
    node.name === "eval" || // Check for 'eval'
    babelTypes.isThisExpression(node) || // Check for 'this'
    babelTypes.isSuper(node) || // Check for 'super'
    babelTypes.isMetaProperty(node) // Check for meta properties like 'new.target'
  );
}

export function hasNestedBinding(path: NodePath, name: string): boolean {
  let found = false;

  // Traverse through the child paths (nested scopes)
  path.traverse({
    Scope(nestedPath) {
      if (nestedPath.scope.hasOwnBinding(name)) {
        found = true;
        nestedPath.stop(); // Stop further traversal if found
      }
    },
  });

  return found;
}

export function isModifiedIdentifier(
  path: NodePath<babelTypes.Identifier>
): boolean {
  const parent = path.parent;

  // Check if the identifier is on the left-hand side of an assignment
  if (babelTypes.isAssignmentExpression(parent) && parent.left === path.node) {
    return true;
  }

  // Check if the identifier is in an update expression (like i++)
  if (babelTypes.isUpdateExpression(parent) && parent.argument === path.node) {
    return true;
  }

  // Check if the identifier is being deleted
  if (
    babelTypes.isUnaryExpression(parent) &&
    parent.operator === "delete" &&
    parent.argument === path.node
  ) {
    return true;
  }

  // Check if the identifier is part of a destructuring pattern being assigned
  if (
    (babelTypes.isObjectPattern(path.parent) ||
      babelTypes.isArrayPattern(path.parent)) &&
    path.key === "elements"
  ) {
    return true;
  }

  return false;
}

/**
 * Determines if the MemberExpression is computed.
 *
 * @param memberPath - The path of the MemberExpression node.
 * @returns True if the MemberExpression is computed; false otherwise.
 */
export function isComputedMemberExpression(
  memberExpression: babelTypes.MemberExpression
): boolean {
  const property = memberExpression.property;

  if (!memberExpression.computed) {
    // If the property is a non-computed identifier, it is not computed
    if (babelTypes.isIdentifier(property)) {
      return false;
    }
  }

  // If the property is a computed literal (string or number), it is not computed
  if (
    babelTypes.isStringLiteral(property) ||
    babelTypes.isNumericLiteral(property)
  ) {
    return false;
  }

  // In all other cases, the property is computed
  return true;
}

export function getObjectPropertyAsString(
  property: babelTypes.ObjectMember
): string {
  babelTypes.assertObjectMember(property);

  if (babelTypes.isIdentifier(property.key)) {
    return property.key.name;
  }

  if (babelTypes.isStringLiteral(property.key)) {
    return property.key.value;
  }

  if (babelTypes.isNumericLiteral(property.key)) {
    return property.key.value.toString();
  }

  return null;
}

/**
 * Gets the property of a MemberExpression as a string.
 *
 * @param memberPath - The path of the MemberExpression node.
 * @returns The property as a string or null if it cannot be determined.
 */
export function getMemberExpressionPropertyAsString(
  member: babelTypes.MemberExpression
): string | null {
  babelTypes.assertMemberExpression(member);

  const property = member.property;

  if (!member.computed && babelTypes.isIdentifier(property)) {
    return property.name;
  }

  if (babelTypes.isStringLiteral(property)) {
    return property.value;
  }

  if (babelTypes.isNumericLiteral(property)) {
    return property.value.toString();
  }

  return null; // If the property cannot be determined
}
