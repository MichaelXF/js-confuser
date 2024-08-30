import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";

function captureScopeState(scope) {
  return {
    bindings: Object.keys(scope.bindings).reduce((acc, name) => {
      acc[name] = {
        identifier: scope.bindings[name].identifier.name,
        kind: scope.bindings[name].kind,
        path: scope.bindings[name].path.node,
      };
      return acc;
    }, {}),
  };
}

function compareScopes(beforeState, afterState, node) {
  let errors = [];

  // Check if bindings were removed or added
  for (let name in beforeState.bindings) {
    if (!afterState.bindings[name]) {
      // errors.push(`"${name}" was removed from the scope at node: ${node.type}`);
    }
  }

  for (let name in afterState.bindings) {
    if (!beforeState.bindings[name]) {
      errors.push(
        `"${name}" was not registered in the scope at node: ${node.type}`
      );
    }
  }

  return errors;
}

/**
 * Asserts all identifiers were correctly registered.
 *
 * The obfuscator checks after every transformation that all bindings are correctly registered.
 *
 * This ensures the integrity of the Babel Scope API.
 *
 * Should only be called in development mode.
 * @param node
 */
export function assertScopeIntegrity(pluginName: string, node: t.File) {
  const scopeStates = new WeakMap();

  // Traverse to capture the initial state of all scopes
  let programPath: NodePath<t.Program> = null;
  traverse(node, {
    enter(path) {
      if (path.isProgram()) {
        programPath = path;
      }

      if (path.scope && Object.keys(path.scope.bindings).length > 0) {
        scopeStates.set(path.node, captureScopeState(path.scope));
      }
    },
  });

  // Perform scope.crawl() on the Program node
  programPath.scope.crawl();

  // Traverse again to compare the scope states
  let errors = [];
  let checkedNewScopes = new Set();

  traverse(node, {
    enter(path) {
      if (path.scope && Object.keys(path.scope.bindings).length > 0) {
        if (checkedNewScopes.has(path.scope)) {
          return;
        }
        checkedNewScopes.add(path.scope);

        const beforeState = scopeStates.get(path.node);
        const afterState = captureScopeState(path.scope);

        if (beforeState) {
          errors = errors.concat(
            compareScopes(beforeState, afterState, path.node)
          );
        }
      }
    },
  });

  if (errors.length > 0) {
    throw new Error(
      `${pluginName} scope integrity check failed:\n${errors.join("\n")}`
    );
  }
}