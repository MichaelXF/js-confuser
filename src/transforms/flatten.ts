import * as t from "@babel/types";
import { NodePath, PluginObj } from "@babel/core";
import {
  insertIntoNearestBlockScope,
  isReservedIdentifier,
} from "../utils/ast-utils";
import { PluginArg } from "./plugin";
import { computeProbabilityMap } from "../probability";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin("flatten");

  function flattenFunction(
    path: NodePath<t.FunctionDeclaration | t.FunctionExpression>
  ) {
    const functionName = path.node.id ? path.node.id.name : "anonymous";
    if (!computeProbabilityMap(me.options.flatten, (x) => x, functionName)) {
      return;
    }

    const flatObjectName = `__${functionName}_flat_object`;
    const newFnName = `__${functionName}_flat_fn`;

    const getterProps: t.ObjectMember[] = [];
    const setterProps: t.ObjectMember[] = [];
    const flatObjectProperties: t.ObjectMember[] = [];

    // Traverse function to identify variables to be replaced with flat object properties
    path.traverse({
      ReferencedIdentifier: {
        exit(identifierPath) {
          const identifierName = identifierPath.node.name;

          if (identifierName === "value") {
            return false;
          }

          if (
            identifierPath.isBindingIdentifier() ||
            !path.scope.hasBinding(identifierName) ||
            path.scope.hasOwnBinding(identifierName) ||
            path.scope.hasGlobal(identifierName) ||
            isReservedIdentifier(identifierPath.node)
          ) {
            // Skip identifiers that are local to this function
            return;
          }

          // Create getter and setter properties in the flat object
          const getterPropName = `_prop_${identifierName}`;
          const setterPropName = `_prop_${identifierName}`;

          console.log(identifierName, "Extracting into", getterPropName);

          getterProps.push(
            t.objectMethod(
              "get",
              t.stringLiteral(getterPropName),
              [],
              t.blockStatement([
                t.returnStatement(t.identifier(identifierName)),
              ]),
              false,
              false,
              false
            )
          );

          setterProps.push(
            t.objectMethod(
              "set",
              t.stringLiteral(setterPropName),
              [t.identifier("value")],
              t.blockStatement([
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.identifier(identifierName),
                    t.identifier("value")
                  )
                ),
              ]),
              false,
              false,
              false
            )
          );

          // Replace identifier with a reference to the flat object property
          identifierPath.replaceWith(
            t.memberExpression(
              t.identifier(flatObjectName),
              t.stringLiteral(getterPropName),
              true
            )
          );
          identifierPath.skip();
        },
      },
    });

    flatObjectProperties.push(...getterProps, ...setterProps);

    // Create the flat object variable declaration
    const flatObjectDeclaration = t.variableDeclaration("var", [
      t.variableDeclarator(
        t.identifier(flatObjectName),
        t.objectExpression(flatObjectProperties)
      ),
    ]);

    // Create the new flattened function
    const flattenedFunctionDeclaration = t.functionDeclaration(
      t.identifier(newFnName),
      [t.arrayPattern(path.node.params), t.identifier(flatObjectName)],
      path.node.body
    );

    // Replace original function body with a call to the flattened function
    path.node.body = t.blockStatement([
      flatObjectDeclaration,
      t.returnStatement(
        t.callExpression(t.identifier(newFnName), [
          t.identifier("arguments"),
          t.identifier(flatObjectName),
        ])
      ),
    ]);

    // Add the new flattened function at the top level
    const newPaths = insertIntoNearestBlockScope(
      path,
      flattenedFunctionDeclaration
    );

    newPaths.forEach((newPath) => newPath.stop());
    path.stop();
  }

  return {
    visitor: {
      FunctionDeclaration: {
        exit(path: NodePath<t.FunctionDeclaration>) {
          flattenFunction(path);
        },
      },
      FunctionExpression: {
        exit(path: NodePath<t.FunctionExpression>) {
          flattenFunction(path);
        },
      },
    },
  };
};
