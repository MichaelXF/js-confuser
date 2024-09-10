import * as t from "@babel/types";
import { NodePath } from "@babel/core";
import { ok } from "assert";

export function containsLexicallyBoundVariables(path: NodePath): boolean {
  var foundLexicalDeclaration = false;

  path.traverse({
    VariableDeclaration(declarationPath) {
      if (
        declarationPath.node.kind === "let" ||
        declarationPath.node.kind === "const"
      ) {
        foundLexicalDeclaration = true;
        declarationPath.stop();
      }
    },

    ClassDeclaration(declarationPath) {
      foundLexicalDeclaration = true;
      declarationPath.stop();
    },
  });

  return foundLexicalDeclaration;
}

export function getPatternIdentifierNames(path: NodePath): string[] {
  var names = new Set<string>();

  var functionParent = path.find((parent) => parent.isFunction());

  path.traverse({
    BindingIdentifier: (bindingPath) => {
      var bindingFunctionParent = bindingPath.find((parent) =>
        parent.isFunction()
      );
      if (functionParent === bindingFunctionParent) {
        names.add(bindingPath.node.name);
      }
    },
  });

  // Check if the path itself is a binding identifier
  if (path.isBindingIdentifier()) {
    names.add(path.node.name);
  }

  return Array.from(names);
}

/**
 * Ensures a `String Literal` is 'computed' before replacing it with a more complex expression.
 *
 * ```js
 * // Input
 * {
 *    "myToBeEncodedString": "value"
 * }
 *
 * // Output
 * {
 *    ["myToBeEncodedString"]: "value"
 * }
 * ```
 * @param path
 */
export function ensureComputedExpression(path: NodePath<t.Node>) {
  if (
    (t.isObjectMember(path.parent) ||
      t.isClassMethod(path.parent) ||
      t.isClassProperty(path.parent)) &&
    path.parent.key === path.node &&
    !path.parent.computed
  ) {
    path.parent.computed = true;
  }
}

/**
 * Retrieves a function name from debugging purposes.
 * - Function Declaration / Expression
 * - Variable Declaration
 * - Object property / method
 * - Class property / method
 * - Program returns "[Program]"
 * - Default returns "anonymous"
 * @param path
 * @returns
 */
export function getFunctionName(path: NodePath<t.Function>): string {
  if (!path) return "null";
  if (path.isProgram()) return "[Program]";

  // Check function declaration/expression ID
  if (
    (t.isFunctionDeclaration(path.node) || t.isFunctionExpression(path.node)) &&
    path.node.id
  ) {
    return path.node.id.name;
  }

  // Check for containing variable declaration
  if (
    path.parentPath?.isVariableDeclarator() &&
    t.isIdentifier(path.parentPath.node.id)
  ) {
    return path.parentPath.node.id.name;
  }

  if (path.isObjectMethod() || path.isClassMethod()) {
    var property = getObjectPropertyAsString(path.node);
    if (property) return property;
  }

  // Check for containing property in an object
  if (
    path.parentPath?.isObjectProperty() ||
    path.parentPath?.isClassProperty()
  ) {
    var property = getObjectPropertyAsString(path.parentPath.node);
    if (property) return property;
  }

  var output = "anonymous";

  if (path.isFunction()) {
    if (path.node.generator) {
      output += "*";
    } else if (path.node.async) {
      output = "async " + output;
    }
  }

  return output;
}

export function isModuleImport(path: NodePath<t.StringLiteral>) {
  // Import Declaration
  if (path.parentPath.isImportDeclaration()) {
    return true;
  }

  // Dynamic Import / require() call
  if (
    t.isCallExpression(path.parent) &&
    (t.isIdentifier(path.parent.callee, { name: "require" }) ||
      t.isImport(path.parent.callee)) &&
    path.node === path.parent.arguments[0]
  ) {
    return true;
  }

  return false;
}

export function getParentFunctionOrProgram(
  path: NodePath<any>
): NodePath<t.Function | t.Program> {
  if (path.isProgram()) return path;

  // Find the nearest function-like parent
  const functionOrProgramPath = path.findParent(
    (parentPath) => parentPath.isFunction() || parentPath.isProgram()
  ) as NodePath<t.Function | t.Program>;

  ok(functionOrProgramPath);
  return functionOrProgramPath;
}

export function insertIntoNearestBlockScope(
  path: NodePath,
  ...nodesToInsert: t.Statement[]
): NodePath[] {
  // Traverse up the AST until we find a BlockStatement or Program
  let targetPath: NodePath = path;

  while (
    targetPath &&
    !t.isBlockStatement(targetPath.node) &&
    !t.isProgram(targetPath.node)
  ) {
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

export function getObjectPropertyAsString(
  property: t.ObjectMember | t.ClassProperty | t.ClassMethod
): string {
  ok(
    t.isObjectMember(property) ||
      t.isClassProperty(property) ||
      t.isClassMethod(property)
  );

  if (!property.computed && t.isIdentifier(property.key)) {
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

/**
 * Prepends and registers a list of nodes to the beginning of a block.
 *
 * - Preserves import declarations by inserting after the last import declaration.
 * - Handles arrow functions
 * - Handles switch cases
 * @param path
 * @param nodes
 * @returns
 */
export function prepend(
  path: NodePath,
  ...nodesIn: (t.Statement | t.Statement[])[]
): NodePath[] {
  var nodes: t.Statement[] = [];
  if (Array.isArray(nodesIn[0])) {
    ok(nodesIn.length === 1);
    nodes = nodesIn[0];
  } else {
    nodes = nodesIn as t.Statement[];
  }

  var listParent = path.find(
    (p) => p.isFunction() || p.isBlock() || p.isSwitchCase()
  );
  if (!listParent) {
    throw new Error("Could not find a suitable parent to prepend to");
  }

  function registerPaths(paths: NodePath[]) {
    for (var path of paths) {
      if (path.isVariableDeclaration() && path.node.kind === "var") {
        getParentFunctionOrProgram(path).scope.registerDeclaration(path);
      }
      path.scope.registerDeclaration(path);
    }

    return paths;
  }

  if (listParent.isProgram()) {
    // Preserve import declarations
    // Filter out import declarations
    const body = listParent.get("body");
    const lastImportIndex = body.findIndex(
      (path) => !path.isImportDeclaration()
    );

    if (lastImportIndex === 0 || lastImportIndex === -1) {
      // No non-import declarations, so we can safely unshift everything
      return registerPaths(listParent.unshiftContainer("body", nodes));
    } else {
      // Insert the nodes after the last import declaration
      return registerPaths(body[lastImportIndex - 1].insertAfter(nodes));
    }
  }

  if (listParent.isFunction()) {
    var body = listParent.get("body");

    if (listParent.isArrowFunctionExpression() && listParent.node.expression) {
      if (!body.isBlockStatement()) {
        body.replaceWith(
          t.blockStatement([t.returnStatement(body.node as t.Expression)])
        );
      }
    }

    ok(body.isBlockStatement());

    return registerPaths(body.unshiftContainer("body", nodes));
  }

  if (listParent.isBlock()) {
    return registerPaths(listParent.unshiftContainer("body", nodes));
  } else if (listParent.isSwitchCase()) {
    return registerPaths(listParent.unshiftContainer("consequent", nodes));
  }

  ok(false);
}

export function prependProgram(
  path: NodePath,
  ...nodes: (t.Statement | t.Statement[])[]
) {
  var program = path.find((p) => p.isProgram());
  ok(program);
  return prepend(program, ...nodes);
}

/**
 * Subset of BindingIdentifier, excluding non-defined assignment expressions.
 *
 * @example
 * var a = 1; // true
 * var {c} = {} // true
 * function b() {} // true
 * function d([e] = [], ...f) {} // true
 *
 * f = 0; // false
 * f(); // false
 * @param path
 * @returns
 */
export function isDefiningIdentifier(path: NodePath<t.Identifier>) {
  if (path.key === "id" && path.parentPath.isFunction()) return true;
  if (path.key === "id" && path.parentPath.isClassDeclaration) return true;

  var maxTraversalPath = path.find(
    (p) =>
      (p.key === "id" && p.parentPath?.isVariableDeclarator()) ||
      (p.listKey === "params" && p.parentPath?.isFunction()) ||
      (p.key === "param" && p.parentPath?.isCatchClause())
  );

  if (!maxTraversalPath) return false;

  var cursor: NodePath = path;
  while (cursor && cursor !== maxTraversalPath) {
    if (
      cursor.parentPath.isObjectProperty() &&
      cursor.parentPath.parentPath?.isObjectPattern()
    ) {
      if (cursor.key !== "value") {
        return false;
      }
    } else if (cursor.parentPath.isArrayPattern()) {
      if (cursor.listKey !== "elements") {
        return false;
      }
    } else if (cursor.parentPath.isRestElement()) {
      if (cursor.key !== "argument") {
        return false;
      }
    } else if (cursor.parentPath.isAssignmentPattern()) {
      if (cursor.key !== "left") {
        return false;
      }
    } else if (cursor.parentPath.isObjectPattern()) {
    } else return false;

    cursor = cursor.parentPath;
  }

  return true;
}

/**
 * @example
 * function id() {} // true
 * class id {} // true
 * var id; // false
 * @param path
 * @returns
 */
export function isStrictIdentifier(path: NodePath): boolean {
  if (
    path.key === "id" &&
    (path.parentPath.isFunction() || path.parentPath.isClass())
  )
    return true;

  return false;
}
