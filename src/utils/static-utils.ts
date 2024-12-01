import * as t from "@babel/types";

// Function to check if a node is a static value
export function isStaticValue(node: t.Node): boolean {
  // Check for literals which are considered static
  if (
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node) ||
    t.isBooleanLiteral(node) ||
    t.isNullLiteral(node)
  ) {
    if (t.isDirectiveLiteral(node)) return false;

    return true;
  }

  // Handle unary expressions like -42
  if (t.isUnaryExpression(node)) {
    // Only consider certain operators as static (e.g., -, +)
    if (["-", "+", "!", "~", "void"].includes(node.operator)) {
      return isStaticValue(node.argument);
    }
    return false;
  }

  // Handle binary expressions with static values only
  if (t.isBinaryExpression(node)) {
    return isStaticValue(node.left) && isStaticValue(node.right);
  }

  // Handle logical expressions (&&, ||) with static values only
  if (t.isLogicalExpression(node)) {
    return isStaticValue(node.left) && isStaticValue(node.right);
  }

  // Handle conditional (ternary) expressions with static values
  if (t.isConditionalExpression(node)) {
    return (
      isStaticValue(node.test) &&
      isStaticValue(node.consequent) &&
      isStaticValue(node.alternate)
    );
  }

  // Handle array expressions where all elements are static
  if (t.isArrayExpression(node)) {
    return node.elements.every(
      (element) => element !== null && isStaticValue(element)
    );
  }

  // Handle object expressions where all properties are static
  if (t.isObjectExpression(node)) {
    return node.properties.every((prop) => {
      if (t.isObjectProperty(prop)) {
        return isStaticValue(prop.key) && isStaticValue(prop.value);
      } else if (t.isSpreadElement(prop)) {
        return isStaticValue(prop.argument);
      }
      return false;
    });
  }

  // Add more cases as needed, depending on what you consider "static"
  return false;
}
