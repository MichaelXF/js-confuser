import * as t from "@babel/types";
import { NodePath } from "@babel/core";
import { ok } from "assert";

export function getParentFunctionOrProgram(
  path: NodePath<any>
): NodePath<t.Function | t.Program> {
  // Find the nearest function-like parent
  const functionOrProgramPath = path.findParent(
    (parentPath) => parentPath.isFunction() || parentPath.isProgram()
  );

  return functionOrProgramPath as NodePath<t.Function>;

  ok(false);
}

export function insertIntoNearestBlockScope(
  path: NodePath,
  ...nodesToInsert: t.Statement[]
): NodePath[] {
  // Traverse up the AST until we find a BlockStatement or Program
  let targetPath: NodePath = path;

  while (targetPath && !t.isProgram(targetPath.node)) {
    targetPath = targetPath.parentPath;
  }

  // Ensure that we found a valid insertion point
  if (t.isBlockStatement(targetPath.node)) {
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
  node: t.Identifier | t.JSXIdentifier
): boolean {
  return (
    node.name === "arguments" || // Check for 'arguments'
    node.name === "undefined" || // Check for 'undefined'
    node.name === "NaN" || // Check for 'NaN'
    node.name === "Infinity" || // Check for 'Infinity'
    node.name === "eval" || // Check for 'eval'
    t.isThisExpression(node) || // Check for 'this'
    t.isSuper(node) || // Check for 'super'
    t.isMetaProperty(node) // Check for meta properties like 'new.target'
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

export function isModifiedIdentifier(path: NodePath<t.Identifier>): boolean {
  const parent = path.parent;

  // Check if the identifier is on the left-hand side of an assignment
  if (t.isAssignmentExpression(parent) && parent.left === path.node) {
    return true;
  }

  // Check if the identifier is in an update expression (like i++)
  if (t.isUpdateExpression(parent) && parent.argument === path.node) {
    return true;
  }

  // Check if the identifier is being deleted
  if (
    t.isUnaryExpression(parent) &&
    parent.operator === "delete" &&
    parent.argument === path.node
  ) {
    return true;
  }

  // Check if the identifier is part of a destructuring pattern being assigned
  if (
    (t.isObjectPattern(path.parent) || t.isArrayPattern(path.parent)) &&
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
  memberExpression: t.MemberExpression
): boolean {
  const property = memberExpression.property;

  if (!memberExpression.computed) {
    // If the property is a non-computed identifier, it is not computed
    if (t.isIdentifier(property)) {
      return false;
    }
  }

  // If the property is a computed literal (string or number), it is not computed
  if (t.isStringLiteral(property) || t.isNumericLiteral(property)) {
    return false;
  }

  // In all other cases, the property is computed
  return true;
}

export function getObjectPropertyAsString(property: t.ObjectMember): string {
  t.assertObjectMember(property);

  if (t.isIdentifier(property.key)) {
    return property.key.name;
  }

  if (t.isStringLiteral(property.key)) {
    return property.key.value;
  }

  if (t.isNumericLiteral(property.key)) {
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
  member: t.MemberExpression
): string | null {
  t.assertMemberExpression(member);

  const property = member.property;

  if (!member.computed && t.isIdentifier(property)) {
    return property.name;
  }

  if (t.isStringLiteral(property)) {
    return property.value;
  }

  if (t.isNumericLiteral(property)) {
    return property.value.toString();
  }

  return null; // If the property cannot be determined
}
