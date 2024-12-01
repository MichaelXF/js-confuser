import * as t from "@babel/types";
import { NodePath } from "@babel/traverse";
import { ok } from "assert";
import { deepClone } from "./node";

export function getPatternIdentifierNames(
  path: NodePath | NodePath[]
): Set<string> {
  if (Array.isArray(path)) {
    var allNames = new Set<string>();
    for (var p of path) {
      var names = getPatternIdentifierNames(p);
      for (var name of names) {
        allNames.add(name);
      }
    }

    return allNames;
  }
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

  return names;
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

export function getBlock(path: NodePath) {
  return path.find((p) => p.isBlock()) as NodePath<t.Block>;
}

export function getParentFunctionOrProgram(
  path: NodePath
): NodePath<t.Function | t.Program> {
  if (path.isProgram()) return path;

  // Find the nearest function-like parent
  const functionOrProgramPath = path.findParent(
    (parentPath) => parentPath.isFunction() || parentPath.isProgram()
  ) as NodePath<t.Function | t.Program>;

  ok(functionOrProgramPath);
  return functionOrProgramPath;
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

function nodeListToNodes(nodesIn: (t.Statement | t.Statement[])[]) {
  var nodes: t.Statement[] = [];
  if (Array.isArray(nodesIn[0])) {
    ok(nodesIn.length === 1);
    nodes = nodesIn[0];
  } else {
    nodes = nodesIn as t.Statement[];
  }

  return nodes;
}

/**
 * Appends to the bottom of a block. Preserving last expression for the top level.
 */
export function append(
  path: NodePath,
  ...nodesIn: (t.Statement | t.Statement[])[]
) {
  var nodes = nodeListToNodes(nodesIn);

  var listParent = path.find(
    (p) => p.isFunction() || p.isBlock() || p.isSwitchCase()
  );
  if (!listParent) {
    throw new Error("Could not find a suitable parent to prepend to");
  }

  if (listParent.isProgram()) {
    var lastExpression = listParent.get("body").at(-1);
    if (lastExpression.isExpressionStatement()) {
      return lastExpression.insertBefore(nodes);
    }
  }

  if (listParent.isSwitchCase()) {
    return listParent.pushContainer("consequent", nodes);
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

    return body.pushContainer("body", nodes);
  }

  ok(listParent.isBlock());
  return listParent.pushContainer("body", nodes);
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
  var nodes = nodeListToNodes(nodesIn);

  var listParent = path.find(
    (p) => p.isFunction() || p.isBlock() || p.isSwitchCase()
  );
  if (!listParent) {
    throw new Error("Could not find a suitable parent to prepend to");
  }

  if (listParent.isProgram()) {
    // Preserve import declarations
    // Filter out import declarations
    const body = listParent.get("body");
    let afterImport = 0;
    for (var stmt of body) {
      if (!stmt.isImportDeclaration()) {
        break;
      }
      afterImport++;
    }

    if (afterImport === 0) {
      // No import declarations, so we can safely unshift everything
      return listParent.unshiftContainer("body", nodes);
    }

    // Insert the nodes after the last import declaration
    return body[afterImport - 1].insertAfter(nodes);
  }

  if (listParent.isFunction()) {
    var body = listParent.get("body");

    if (listParent.isArrowFunctionExpression() && listParent.node.expression) {
      if (!body.isBlockStatement()) {
        body = body.replaceWith(
          t.blockStatement([t.returnStatement(body.node as t.Expression)])
        )[0];
      }
    }

    ok(body.isBlockStatement());

    return body.unshiftContainer("body", nodes);
  }

  if (listParent.isBlock()) {
    return listParent.unshiftContainer("body", nodes);
  }

  if (listParent.isSwitchCase()) {
    return listParent.unshiftContainer("consequent", nodes);
  }

  ok(false);
}

export function prependProgram(
  path: NodePath,
  ...nodes: (t.Statement | t.Statement[])[]
) {
  var program = path.find((p) => p.isProgram());
  ok(program);
  ok(program.isProgram());
  return prepend(program, ...nodes);
}

/**
 * A referenced or binding identifier, only names that reflect variables.
 *
 * - Excludes labels
 *
 * @param path
 * @returns
 */
export function isVariableIdentifier(path: NodePath<t.Identifier>) {
  if (
    !path.isReferencedIdentifier() &&
    !(path as NodePath).isBindingIdentifier()
  )
    return false;

  // abc: {} // not a variable identifier
  if (path.key === "label" && path.parentPath?.isLabeledStatement())
    return false;

  return true;
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
  if (
    path.key === "local" &&
    (path.parentPath.isImportSpecifier() ||
      path.parentPath.isImportDefaultSpecifier() ||
      path.parentPath.isImportNamespaceSpecifier())
  )
    return true;

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

export function isExportedIdentifier(path: NodePath<t.Identifier>) {
  // Check if the identifier is directly inside an ExportNamedDeclaration
  if (path.parentPath.isExportNamedDeclaration()) {
    return true;
  }

  // Check if the identifier is in an ExportDefaultDeclaration
  if (path.parentPath.isExportDefaultDeclaration()) {
    return true;
  }

  // Check if the identifier is within an ExportSpecifier
  if (
    path.parentPath.isExportSpecifier() &&
    path.parentPath.parentPath.isExportNamedDeclaration()
  ) {
    return true;
  }

  // Check if it's part of an exported variable declaration (e.g., export const a = 1;)
  if (
    path.parentPath.isVariableDeclarator() &&
    path.parentPath.parentPath.parentPath.isExportNamedDeclaration()
  ) {
    return true;
  }

  // Check if it's part of an exported function declaration (e.g., export function abc() {})
  if (
    (path.parentPath.isFunctionDeclaration() ||
      path.parentPath.isClassDeclaration()) &&
    path.parentPath.parentPath.isExportNamedDeclaration()
  ) {
    return true;
  }

  return false;
}

/**
 * @example
 * function abc() {
 *   "use strict";
 * } // true
 * @param path
 * @returns
 */
export function isStrictMode(path: NodePath) {
  // Classes are always in strict mode
  if (path.isClass()) return true;

  if (path.isBlock()) {
    if (path.isTSModuleBlock()) return false;
    return (path.node as t.BlockStatement | t.Program).directives.some(
      (directive) => directive.value.value === "use strict"
    );
  }

  if (path.isFunction()) {
    const fnBody = path.get("body");
    if (fnBody.isBlock()) {
      return isStrictMode(fnBody);
    }
  }

  return false;
}

/**
 * A modified identifier is an identifier that is assigned to or updated.
 *
 * - Assignment Expression
 * - Update Expression
 *
 * @param identifierPath
 */
export function isModifiedIdentifier(identifierPath: NodePath<t.Identifier>) {
  var isModification = false;
  if (identifierPath.parentPath.isUpdateExpression()) {
    isModification = true;
  }
  if (
    identifierPath.find(
      (p) => p.key === "left" && p.parentPath?.isAssignmentExpression()
    )
  ) {
    isModification = true;
  }

  return isModification;
}

export function replaceDefiningIdentifierToMemberExpression(
  path: NodePath<t.Identifier>,
  memberExpression: t.MemberExpression | t.Identifier
) {
  // function id(){} -> var id = function() {}
  if (path.key === "id" && path.parentPath.isFunctionDeclaration()) {
    var asFunctionExpression = deepClone(
      path.parentPath.node
    ) as t.Node as t.FunctionExpression;
    asFunctionExpression.type = "FunctionExpression";

    path.parentPath.replaceWith(
      t.expressionStatement(
        t.assignmentExpression("=", memberExpression, asFunctionExpression)
      )
    );
    return;
  }

  // class id{} -> var id = class {}
  if (path.key === "id" && path.parentPath.isClassDeclaration()) {
    var asClassExpression = deepClone(
      path.parentPath.node
    ) as t.Node as t.ClassExpression;
    asClassExpression.type = "ClassExpression";

    path.parentPath.replaceWith(
      t.expressionStatement(
        t.assignmentExpression("=", memberExpression, asClassExpression)
      )
    );
    return;
  }

  // var id = 1 -> id = 1
  var variableDeclaratorChild = path.find(
    (p) =>
      p.key === "id" &&
      p.parentPath?.isVariableDeclarator() &&
      p.parentPath?.parentPath?.isVariableDeclaration()
  ) as NodePath<t.VariableDeclarator["id"]>;

  if (variableDeclaratorChild) {
    var variableDeclarator =
      variableDeclaratorChild.parentPath as NodePath<t.VariableDeclarator>;
    var variableDeclaration =
      variableDeclarator.parentPath as NodePath<t.VariableDeclaration>;

    if (variableDeclaration.type === "VariableDeclaration") {
      ok(
        variableDeclaration.node.declarations.length === 1,
        "Multiple declarations not supported"
      );
    }

    const id = variableDeclarator.get("id");
    const init = variableDeclarator.get("init");

    var newExpression: t.Node = id.node;

    var isForInitializer =
      (variableDeclaration.key === "init" ||
        variableDeclaration.key === "left") &&
      variableDeclaration.parentPath.isFor();

    if (init.node || !isForInitializer) {
      newExpression = t.assignmentExpression(
        "=",
        id.node,
        init.node || t.identifier("undefined")
      );
    }

    if (!isForInitializer) {
      newExpression = t.expressionStatement(newExpression as t.Expression);
    }

    path.replaceWith(memberExpression);

    if (variableDeclaration.isVariableDeclaration()) {
      variableDeclaration.replaceWith(newExpression);
    }

    return;
  }

  // Safely replace the identifier with the member expression
  // ensureComputedExpression(path);
  // path.replaceWith(memberExpression);
}

/**
 * @example
 * undefined // true
 * void 0 // true
 */
export function isUndefined(path: NodePath) {
  if (path.isIdentifier() && path.node.name === "undefined") {
    return true;
  }
  if (
    path.isUnaryExpression() &&
    path.node.operator === "void" &&
    path.node.argument.type === "NumericLiteral" &&
    path.node.argument.value === 0
  ) {
    return true;
  }
  return false;
}
