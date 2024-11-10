import { NodePath } from "@babel/traverse";
import { Order } from "../../order";
import { PluginArg, PluginObject } from "../plugin";
import { NodeSymbol, PREDICTABLE } from "../../constants";
import * as t from "@babel/types";
import { isStaticValue } from "../../utils/static-utils";
import {
  getPatternIdentifierNames,
  isStrictMode,
  prepend,
} from "../../utils/ast-utils";
import Template from "../../templates/template";

/**
 * Moved Declarations moves variables in two ways:
 *
 * 1) Move variables to top of the current block
 * 2) Move variables as unused function parameters
 */
export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.MovedDeclarations, {
    changeData: {
      variableDeclarations: 0,
      functionParameters: 0,
    },
  });

  function isFunctionEligibleForParameterPacking(
    functionPath: NodePath<t.Function>,
    proposedParameterName: string
  ) {
    // Getter/setter functions must have zero or one formal parameter
    // We cannot add extra parameters to them
    if (functionPath.isObjectMethod() || functionPath.isClassMethod()) {
      if (functionPath.node.kind !== "method") {
        return false;
      }
    }

    // Rest params check
    if (functionPath.get("params").find((p) => p.isRestElement())) return false;

    // Max 1,000 parameters
    if (functionPath.get("params").length > 1_000) return false;

    // Check for duplicate parameter names
    var bindingIdentifiers = getPatternIdentifierNames(
      functionPath.get("params")
    );

    // Duplicate parameter name not allowed
    if (bindingIdentifiers.has(proposedParameterName)) return false;

    return true;
  }

  return {
    visitor: {
      FunctionDeclaration: {
        exit(path) {
          var functionPath = path.findParent((path) =>
            path.isFunction()
          ) as NodePath<t.Function>;

          if (!functionPath || !(functionPath.node as NodeSymbol)[PREDICTABLE])
            return;

          var fnBody = functionPath.get("body");

          if (!fnBody.isBlockStatement()) return;

          // Must be direct child of the function
          if (path.parentPath !== fnBody) return;

          const functionName = path.node.id.name;

          // Must be eligible for parameter packing
          if (
            !isFunctionEligibleForParameterPacking(functionPath, functionName)
          )
            return;

          var strictMode = isStrictMode(functionPath);

          // Default parameters are not allowed when 'use strict' is declared
          if (strictMode) return;

          var functionExpression = path.node as t.Node as t.FunctionExpression;
          functionExpression.type = "FunctionExpression";
          functionExpression.id = null;

          var identifier = t.identifier(functionName);
          functionPath.node.params.push(identifier);

          var paramPath = functionPath.get("params").at(-1);

          // Update binding to point to new path
          const binding = functionPath.scope.getBinding(functionName);
          if (binding) {
            binding.kind = "param";
            binding.path = paramPath;
            binding.identifier = identifier;
          }

          prepend(
            fnBody,
            new Template(`
              if(!${functionName}) {
                ${functionName} = {functionExpression};
              }
              `).single({ functionExpression: functionExpression })
          );

          path.remove();
          me.changeData.functionParameters++;
        },
      },
      VariableDeclaration: {
        exit(path) {
          if (me.isSkipped(path)) return;
          if (path.node.kind !== "var") return;
          if (path.node.declarations.length !== 1) return;

          var insertionMethod = "variableDeclaration";
          var functionPath = path.findParent((path) =>
            path.isFunction()
          ) as NodePath<t.Function>;

          const declaration = path.node.declarations[0];
          if (!t.isIdentifier(declaration.id)) return;
          const varName = declaration.id.name;

          var allowDefaultParamValue = true;

          if (functionPath && (functionPath.node as NodeSymbol)[PREDICTABLE]) {
            // Check for "use strict" directive
            // Strict mode disallows non-simple parameters
            // So we can't move the declaration to the function parameters
            var strictMode = isStrictMode(functionPath);
            if (strictMode) {
              allowDefaultParamValue = false;
            }

            // Cannot add variables after rest element
            // Cannot add over 1,000 parameters
            if (isFunctionEligibleForParameterPacking(functionPath, varName)) {
              insertionMethod = "functionParameter";
            }
          }

          const { name } = declaration.id;
          const value = declaration.init || t.identifier("undefined");

          const isStatic = isStaticValue(value);
          let isDefinedAtTop = false;
          const parentPath = path.parentPath;
          if (parentPath.isBlock()) {
            isDefinedAtTop =
              parentPath
                .get("body")
                .filter((x) => x.type !== "ImportDeclaration")
                .indexOf(path) === 0;
          }

          // Already at the top - nothing will change
          if (insertionMethod === "variableDeclaration" && isDefinedAtTop) {
            return;
          }

          let defaultParamValue: t.Expression;

          if (
            insertionMethod === "functionParameter" &&
            isStatic &&
            isDefinedAtTop &&
            allowDefaultParamValue
          ) {
            defaultParamValue = value;
            path.remove();
          } else {
            // For-in / For-of can only reference the variable name
            if (
              parentPath.isForInStatement() ||
              parentPath.isForOfStatement()
            ) {
              path.replaceWith(t.identifier(name));
            } else {
              path.replaceWith(
                t.assignmentExpression(
                  "=",
                  t.identifier(name),
                  declaration.init || t.identifier("undefined")
                )
              );
            }
          }

          switch (insertionMethod) {
            case "functionParameter":
              var identifier = t.identifier(name);

              var param: t.Pattern | t.Identifier = identifier;
              if (allowDefaultParamValue && defaultParamValue) {
                param = t.assignmentPattern(param, defaultParamValue);
              }

              functionPath.node.params.push(param);

              var paramPath = functionPath.get("params").at(-1);

              // Update binding to point to new path
              const binding = functionPath.scope.getBinding(name);
              if (binding) {
                binding.kind = "param";
                binding.path = paramPath;
                binding.identifier = identifier;
              }

              me.changeData.functionParameters++;
              break;
            case "variableDeclaration":
              var block = path.findParent((path) =>
                path.isBlock()
              ) as NodePath<t.Block>;

              var topNode = block.node.body.filter(
                (x) => x.type !== "ImportDeclaration"
              )[0];
              const variableDeclarator = t.variableDeclarator(
                t.identifier(name)
              );

              if (t.isVariableDeclaration(topNode) && topNode.kind === "var") {
                topNode.declarations.push(variableDeclarator);
                break;
              } else {
                prepend(
                  block,
                  me.skip(t.variableDeclaration("var", [variableDeclarator]))
                );
              }

              me.changeData.variableDeclarations++;

              break;
          }
        },
      },
    },
  };
};
