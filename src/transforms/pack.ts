import * as t from "@babel/types";
import Obfuscator from "../obfuscator";
import Template from "../templates/template";
import traverse, { NodePath } from "@babel/traverse";
import {
  isDefiningIdentifier,
  isReservedIdentifier,
  isVariableIdentifier,
} from "../utils/ast-utils";

export default function pack(ast: t.File, obfuscator: Obfuscator) {
  const objectName = obfuscator.nameGen.generate();
  const mappings = new Map<string, string>();
  const typeofMappings = new Map<string, string>();

  const objectProperties: t.ObjectMethod[] = [];

  const prependNodes: t.Statement[] = [];

  for (const statement of ast.program.body) {
    if (t.isImportDeclaration(statement)) {
      prependNodes.push(statement);
    }
  }

  traverse(ast, {
    ImportDeclaration(path) {
      path.remove();

      // Ensure bindings are removed -> variable becomes a global -> added to mappings object
      path.scope.crawl();
    },
    Program(path) {
      path.scope.crawl();
    },

    Identifier: {
      exit(path) {
        if (!isVariableIdentifier(path)) return;

        if (isDefiningIdentifier(path)) return;

        const identifierName = path.node.name;
        if (obfuscator.options.globalVariables.has(identifierName)) return;
        if (isReservedIdentifier(path.node)) return;

        if (!path.scope.hasGlobal(identifierName)) return;

        if (
          path.key === "argument" &&
          path.parentPath.isUnaryExpression({ operator: "typeof" })
        ) {
          const unaryExpression = path.parentPath;

          let propertyName = typeofMappings.get(identifierName);
          if (!propertyName) {
            propertyName = obfuscator.nameGen.generate();
            typeofMappings.set(identifierName, propertyName);

            // get identifier() { return typeof identifier; }
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
          propertyName = obfuscator.nameGen.generate();
          mappings.set(identifierName, propertyName);

          // get identifier() { return identifier; }
          objectProperties.push(
            t.objectMethod(
              "get",
              t.stringLiteral(propertyName),
              [],
              t.blockStatement([
                t.returnStatement(t.identifier(identifierName)),
              ])
            )
          );

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

        path.replaceWith(
          t.memberExpression(
            t.identifier(objectName),
            t.stringLiteral(propertyName),
            true
          )
        );
      },
    },
  });

  const objectExpression = t.objectExpression(objectProperties);

  const outputCode = Obfuscator.generateCode(ast, {
    ...obfuscator.options,
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
}
