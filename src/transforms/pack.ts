import * as t from "@babel/types";
import Obfuscator from "../obfuscator";
import Template from "../templates/template";
import {
  isDefiningIdentifier,
  isModifiedIdentifier,
  isVariableIdentifier,
} from "../utils/ast-utils";
import {
  GEN_NODE,
  NodeSymbol,
  reservedIdentifiers,
  reservedNodeModuleIdentifiers,
  variableFunctionName,
  WITH_STATEMENT,
} from "../constants";
import { PluginArg, PluginObject } from "./plugin";
import { Order } from "../order";

export interface PackInterface {
  objectName: string;
  mappings: Map<string, string>;
  setterPropsNeeded: Set<string>;
  typeofMappings: Map<string, string>;
}

export default function pack({ Plugin }: PluginArg): PluginObject {
  const me = Plugin(Order.Pack, {
    changeData: {
      globals: 0,
    },
  });

  // RGF functions will re-use parent Pack Interface
  let packInterface = me.obfuscator.parentObfuscator?.packInterface;

  // Create new Pack Interface (root)
  if (!packInterface) {
    packInterface = {
      objectName: me.obfuscator.nameGen.generate(),
      mappings: new Map<string, string>(),
      setterPropsNeeded: new Set<string>(),
      typeofMappings: new Map<string, string>(),
    };
    me.obfuscator.packInterface = packInterface;
  }

  const { objectName, mappings, setterPropsNeeded, typeofMappings } =
    packInterface;

  const prependNodes: t.Statement[] = [];

  return {
    // Transform identifiers, preserve import statements
    visitor: {
      ImportDeclaration(path) {
        prependNodes.push(path.node);
        path.remove();

        // Ensure bindings are removed -> variable becomes a global -> added to mappings object
        path.scope.crawl();
      },

      // TODO: Add support for export statements
      "ExportNamedDeclaration|ExportDefaultDeclaration|ExportAllDeclaration"(
        path
      ) {
        me.error("Export statements are not supported in packed code.");
      },

      Program(path) {
        path.scope.crawl();
      },

      Identifier: {
        exit(path) {
          if (!isVariableIdentifier(path)) return;

          if (isDefiningIdentifier(path)) return;
          if ((path.node as NodeSymbol)[GEN_NODE]) return;
          if ((path.node as NodeSymbol)[WITH_STATEMENT]) return;

          const identifierName = path.node.name;
          if (reservedIdentifiers.has(identifierName)) return;
          if (
            me.options.target === "node" &&
            reservedNodeModuleIdentifiers.has(identifierName)
          ) {
            // Allow module.exports and require
          } else {
            if (me.options.globalVariables.has(identifierName)) return;
          }
          if (identifierName === variableFunctionName) return;
          if (identifierName === objectName) return;

          if (!path.scope.hasGlobal(identifierName)) return;
          if (path.scope.hasBinding(identifierName)) return;

          // Check user's custom implementation
          if (!me.computeProbabilityMap(me.options.pack, identifierName))
            return;

          if (
            path.key === "argument" &&
            path.parentPath.isUnaryExpression({ operator: "typeof" })
          ) {
            const unaryExpression = path.parentPath;

            let propertyName = typeofMappings.get(identifierName);
            if (!propertyName) {
              propertyName = me.obfuscator.nameGen.generate();
              typeofMappings.set(identifierName, propertyName);
            }

            unaryExpression.replaceWith(
              t.memberExpression(
                t.identifier(objectName),
                t.stringLiteral(propertyName),
                true
              )
            );
            return;
          }

          let propertyName = mappings.get(identifierName);
          if (!propertyName) {
            propertyName = me.obfuscator.nameGen.generate();
            mappings.set(identifierName, propertyName);
          }

          // Only add setter if the identifier is modified
          if (isModifiedIdentifier(path)) {
            setterPropsNeeded.add(identifierName);
          }

          path.replaceWith(
            t.memberExpression(
              t.identifier(objectName),
              t.stringLiteral(propertyName),
              true
            )
          );
        },
      },
    },

    // Final AST handler
    // Very last step in the obfuscation process
    finalASTHandler(ast) {
      if (me.obfuscator.parentObfuscator) return ast; // Only for root obfuscator

      // Create object expression
      // Very similar to flatten, maybe refactor to use the same code
      const objectProperties: t.ObjectMethod[] = [];

      me.changeData.globals = mappings.size;

      for (const [identifierName, propertyName] of mappings) {
        // get identifier() { return identifier; }
        objectProperties.push(
          t.objectMethod(
            "get",
            t.stringLiteral(propertyName),
            [],
            t.blockStatement([t.returnStatement(t.identifier(identifierName))])
          )
        );

        // Only add setter if the identifier is modified
        if (setterPropsNeeded.has(identifierName)) {
          // set identifier(value) { return identifier = value; }
          objectProperties.push(
            t.objectMethod(
              "set",
              t.stringLiteral(propertyName),
              [t.identifier(objectName)],
              t.blockStatement([
                t.returnStatement(
                  t.assignmentExpression(
                    "=",
                    t.identifier(identifierName),
                    t.identifier(objectName)
                  )
                ),
              ])
            )
          );
        }
      }

      // Add typeof mappings
      for (const [identifierName, propertyName] of typeofMappings) {
        // get typeof identifier() { return typeof identifier; }
        objectProperties.push(
          t.objectMethod(
            "get",
            t.stringLiteral(propertyName),
            [],
            t.blockStatement([
              t.returnStatement(
                t.unaryExpression("typeof", t.identifier(identifierName))
              ),
            ])
          )
        );
      }

      const objectExpression = t.objectExpression(objectProperties);

      // Convert last expression to return statement
      // This preserves the last expression in the packed code
      var lastStatement = ast.program.body.at(-1);
      if (lastStatement && t.isExpressionStatement(lastStatement)) {
        Object.assign(
          lastStatement,

          t.returnStatement(lastStatement.expression)
        );
      }

      const outputCode = Obfuscator.generateCode(ast, {
        ...me.obfuscator.options,
        compact: true,
      });

      var newAST = new Template(`
    {prependNodes}
    Function({objectName}, {outputCode})({objectExpression});
  `).file({
        objectName: () => t.stringLiteral(objectName),
        outputCode: () => t.stringLiteral(outputCode),
        objectExpression: objectExpression,
        prependNodes: prependNodes,
      });

      return newAST;
    },
  };
}
