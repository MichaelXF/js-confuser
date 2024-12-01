import { NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "./plugin";
import * as t from "@babel/types";
import { Order } from "../order";
import {
  ensureComputedExpression,
  getParentFunctionOrProgram,
  isUndefined,
} from "../utils/ast-utils";
import { Binding, Scope } from "@babel/traverse";
import {
  NO_REMOVE,
  NodeSymbol,
  placeholderVariablePrefix,
  UNSAFE,
} from "../constants";

const identifierMap = new Map<string, () => t.Expression>();
identifierMap.set("undefined", () =>
  t.unaryExpression("void", t.numericLiteral(0))
);
identifierMap.set("Infinity", () =>
  t.binaryExpression("/", t.numericLiteral(1), t.numericLiteral(0))
);

function trySimpleDestructuring(id, init) {
  // Simple array/object destructuring
  if (id.isArrayPattern() && init.isArrayExpression()) {
    const elements = id.get("elements");
    const initElements = init.get("elements");

    if (elements.length === 1 && initElements.length === 1) {
      id.replaceWith(elements[0]);
      init.replaceWith(initElements[0]);
    }
  }

  if (id.isObjectPattern() && init.isObjectExpression()) {
    const properties = id.get("properties");
    const initProperties = init.get("properties");

    if (properties.length === 1 && initProperties.length === 1) {
      const firstProperty = properties[0];
      const firstInitProperty = initProperties[0];

      if (
        firstProperty.isObjectProperty() &&
        firstInitProperty.isObjectProperty()
      ) {
        const firstKey = firstProperty.get("key");
        const firstInitKey = firstInitProperty.get("key");
        if (
          firstKey.isIdentifier() &&
          firstInitKey.isIdentifier() &&
          firstKey.node.name === firstInitKey.node.name
        ) {
          id.replaceWith(firstProperty.node.value);
          init.replaceWith(firstInitProperty.node.value);
        }
      }
    }
  }
}

/**
 * Minify removes unnecessary code and shortens the length for file size.
 *
 * - Dead code elimination
 * - Variable grouping
 * - Constant folding
 * - Shorten literals: True to !0, False to !1, Infinity to 1/0, Undefined to void 0
 * - Remove unused variables, functions
 */
export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Minify);
  return {
    visitor: {
      Program(path) {
        path.scope.crawl();
      },
      // var a; var b; -> var a,b;
      VariableDeclaration: {
        exit(path) {
          if (typeof path.key !== "number") return;
          const kind = path.node.kind;

          // get declaration after this
          const nextDeclaration = path.getSibling(path.key + 1);
          if (
            nextDeclaration.isVariableDeclaration({
              kind: kind,
            })
          ) {
            const declarations = path.get("declarations");

            // Preserve bindings!
            // This is important for dead code elimination
            const bindings: { [name: string]: Binding } = Object.create(null);
            for (var declaration of declarations) {
              for (var idPath of Object.values(
                declaration.getBindingIdentifierPaths()
              )) {
                bindings[idPath.node.name] = idPath.scope.getBinding(
                  idPath.node.name
                );
              }
            }

            nextDeclaration.node.declarations.unshift(
              ...declarations.map((x) => x.node)
            );

            const newBindingIdentifierPaths =
              nextDeclaration.getBindingIdentifierPaths();

            // path.remove() unfortunately removes the bindings
            // We must perverse the entire binding object (referencePaths, constantViolations, etc)
            // and re-add them to the new scope
            path.remove();

            // Add bindings back
            function addBindingsToScope(scope: Scope) {
              for (var name in bindings) {
                const binding = bindings[name];
                if (binding) {
                  binding.path = newBindingIdentifierPaths[name];
                  scope.bindings[name] = binding;
                }
              }
            }

            if (kind === "var") {
              addBindingsToScope(getParentFunctionOrProgram(path).scope);
            }
            addBindingsToScope(path.scope);
          }
        },
      },
      // true -> !0, false -> !1
      BooleanLiteral: {
        exit(path) {
          if (path.node.value) {
            path.replaceWith(t.unaryExpression("!", t.numericLiteral(0)));
          } else {
            path.replaceWith(t.unaryExpression("!", t.numericLiteral(1)));
          }
        },
      },
      // !"" -> !1
      UnaryExpression: {
        exit(path) {
          if (path.node.operator === "!") {
            var argument = path.get("argument");
            if (argument.isNumericLiteral()) return;
            const value = argument.evaluateTruthy();
            const parent = getParentFunctionOrProgram(path);
            if (parent && (parent.node as NodeSymbol)[UNSAFE]) return;

            if (value === undefined) return;

            path.replaceWith(
              t.unaryExpression("!", t.numericLiteral(value ? 1 : 0))
            );
          }
        },
      },
      // "a" + "b" -> "ab"
      BinaryExpression: {
        exit(path) {
          if (path.node.operator !== "+") return;

          const left = path.get("left");
          const right = path.get("right");

          if (!left.isStringLiteral() || !right.isStringLiteral()) return;

          path.replaceWith(t.stringLiteral(left.node.value + right.node.value));
        },
      },
      // a["key"] -> a.key
      MemberExpression: {
        exit(path) {
          if (!path.node.computed) return;

          const property = path.get("property");
          if (!property.isStringLiteral()) return;

          const key = property.node.value;
          if (!t.isValidIdentifier(key)) return;

          path.node.computed = false;
          path.node.property = t.identifier(key);
        },
      },
      // {["key"]: 1} -> {key: 1}
      // {"key": 1} -> {key: 1}
      ObjectProperty: {
        exit(path) {
          var key = path.get("key");
          if (path.node.computed && key.isStringLiteral()) {
            path.node.computed = false;
          }

          if (
            !path.node.computed &&
            key.isStringLiteral() &&
            t.isValidIdentifier(key.node.value)
          ) {
            if (identifierMap.has(key.node.value)) {
              path.node.computed = true;
              key.replaceWith(identifierMap.get(key.node.value)!());
            } else {
              key.replaceWith(t.identifier(key.node.value));
            }
          }
        },
      },
      // (a); -> a;
      SequenceExpression: {
        exit(path) {
          if (path.node.expressions.length === 1) {
            path.replaceWith(path.node.expressions[0]);
          }
        },
      },
      // ; -> ()
      EmptyStatement: {
        exit(path) {
          path.remove();
        },
      },
      // console; -> ();
      ExpressionStatement: {
        exit(path) {
          if (path.get("expression").isIdentifier()) {
            // Preserve last expression of program for RGF
            if (
              path.parentPath?.isProgram() &&
              path.parentPath?.get("body").at(-1) === path
            )
              return;
            path.remove();
          }
        },
      },
      // undefined -> void 0
      // Infinity -> 1/0
      Identifier: {
        exit(path) {
          if (path.isReferencedIdentifier()) {
            if (identifierMap.has(path.node.name)) {
              ensureComputedExpression(path);
              path.replaceWith(identifierMap.get(path.node.name)!());
            }
          }
        },
      },
      // true ? a : b -> a
      ConditionalExpression: {
        exit(path) {
          const testValue = path.get("test").evaluateTruthy();
          if (testValue === undefined) return;

          path.replaceWith(
            testValue ? path.node.consequent : path.node.alternate
          );
        },
      },
      // Remove unused functions
      FunctionDeclaration: {
        exit(path) {
          const id = path.get("id");
          if (
            id.isIdentifier() &&
            !id.node.name.startsWith(placeholderVariablePrefix) &&
            !(path.node as NodeSymbol)[NO_REMOVE]
          ) {
            const binding = path.scope.getBinding(id.node.name);
            if (
              binding &&
              binding.constantViolations.length === 0 &&
              binding.referencePaths.length === 0 &&
              !binding.referenced
            ) {
              path.remove();
            }
          }
        },
      },
      // var x=undefined -> var x
      // Remove unused variables
      // Simple destructuring
      VariableDeclarator: {
        exit(path) {
          if (isUndefined(path.get("init"))) {
            path.node.init = null;
          }

          const id = path.get("id");
          const init = path.get("init");

          trySimpleDestructuring(id, init);

          // Remove unused variables
          // Can only remove if it's pure
          if (id.isIdentifier()) {
            // Do not remove variables in unsafe functions
            const fn = getParentFunctionOrProgram(path);
            if ((fn.node as NodeSymbol)[UNSAFE]) return;

            // Node explicitly marked as not to be removed
            if ((id as NodeSymbol)[NO_REMOVE]) return;

            const binding = path.scope.getBinding(id.node.name);

            if (
              binding &&
              binding.constantViolations.length === 0 &&
              binding.referencePaths.length === 0
            ) {
              if (!init.node || init.isPure()) {
                path.remove();
              } else if (
                path.parentPath.isVariableDeclaration() &&
                path.parentPath.node.declarations.length === 1
              ) {
                path.parentPath.replaceWith(t.expressionStatement(init.node));
              }
            }
          }
        },
      },
      // Simple destructuring
      // Simple arithmetic operations
      AssignmentExpression: {
        exit(path) {
          if (path.node.operator === "=") {
            trySimpleDestructuring(path.get("left"), path.get("right"));
          }
          if (path.node.operator === "+=") {
            const left = path.get("left");
            const right = path.get("right");

            // a += 1 -> a++
            if (right.isNumericLiteral({ value: 1 })) {
              if (left.isIdentifier() || left.isMemberExpression()) {
                path.replaceWith(t.updateExpression("++", left.node));
              }
            }
          }
        },
      },

      // return undefined->return
      ReturnStatement: {
        exit(path) {
          if (isUndefined(path.get("argument"))) {
            path.node.argument = null;
          }
        },
      },
      // while(true) {a();} -> while(true) a();
      // for(;;) {a();} -> for(;;) a();
      // with(a) {a();} -> with(a) a();
      "While|For|WithStatement": {
        exit(_path) {
          var path = _path as NodePath<t.While | t.For | t.WithStatement>;
          var body = path.get("body");

          if (body.isBlock() && body.node.body.length === 1) {
            body.replaceWith(body.node.body[0]);
          }
        },
      },
      // if(a) a(); -> a && a();
      // if(a) { return b; } -> if(a) return b;
      // if(a) { a(); } else { b(); } -> a ? a() : b();
      // if(a) { return b; } else { return c; } -> return a ? b : c;
      IfStatement: {
        exit(path) {
          // BlockStatement to single statement
          const consequent = path.get("consequent");
          const alternate = path.get("alternate");

          const isMoveable = (node: t.Statement) => {
            if (t.isDeclaration(node)) return false;

            return true;
          };

          let testValue = path.get("test").evaluateTruthy();

          const parent = getParentFunctionOrProgram(path);
          if (parent && (parent.node as NodeSymbol)[UNSAFE]) {
            testValue = undefined;
          }

          if (typeof testValue !== "undefined") {
            if (
              !alternate.node &&
              consequent.isBlock() &&
              consequent.node.body.length === 1 &&
              isMoveable(consequent.node.body[0])
            ) {
              consequent.replaceWith(consequent.node.body[0]);
            }

            if (
              alternate.node &&
              alternate.isBlock() &&
              alternate.node.body.length === 1 &&
              isMoveable(alternate.node.body[0])
            ) {
              alternate.replaceWith(alternate.node.body[0]);
            }
          }

          if (testValue === false) {
            // if(false){} -> ()
            if (!alternate.node) {
              path.remove();
              return;

              // if(false){a()}else{b()} -> b()
            } else {
              path.replaceWith(alternate.node);
              return;
            }

            // if(true){a()} -> {a()}
          } else if (testValue === true) {
            path.replaceWith(consequent.node);
            return;
          }

          function getResult(path: NodePath): {
            returnPath: NodePath<t.ReturnStatement> | null;
            expressions: t.Expression[];
          } {
            if (!path.node) return null;

            if (path.isReturnStatement()) {
              return { returnPath: path, expressions: [] };
            }
            if (path.isExpressionStatement()) {
              return {
                returnPath: null,
                expressions: [path.get("expression").node],
              };
            }

            if (path.isBlockStatement()) {
              var expressions = [];
              for (var statement of path.get("body")) {
                if (statement.isReturnStatement()) {
                  return { returnPath: statement, expressions: expressions };
                } else if (statement.isExpressionStatement()) {
                  expressions.push(statement.get("expression").node);
                } else {
                  return null;
                }
              }

              return { returnPath: null, expressions: expressions };
            }

            return null;
          }

          var consequentReturn = getResult(consequent);
          var alternateReturn = getResult(alternate);

          if (consequentReturn && alternateReturn) {
            if (consequentReturn.returnPath && alternateReturn.returnPath) {
              function createReturnArgument(
                resultInfo: ReturnType<typeof getResult>
              ) {
                return t.sequenceExpression([
                  ...resultInfo.expressions,
                  resultInfo.returnPath.node.argument ||
                    t.identifier("undefined"),
                ]);
              }

              path.replaceWith(
                t.returnStatement(
                  t.conditionalExpression(
                    path.node.test,
                    createReturnArgument(consequentReturn),
                    createReturnArgument(alternateReturn)
                  )
                )
              );
            } else if (
              !consequentReturn.returnPath &&
              !alternateReturn.returnPath
            ) {
              function joinExpressions(expressions: t.Expression[]) {
                // condition?():() is invalid syntax
                // Just use 0 as a placeholder
                if (expressions.length === 0) return t.numericLiteral(0);

                // No need for sequence expression if there's only one expression
                if (expressions.length === 1) return expressions[0];

                return t.sequenceExpression(expressions);
              }

              path.replaceWith(
                t.conditionalExpression(
                  path.node.test,
                  joinExpressions(consequentReturn.expressions),
                  joinExpressions(alternateReturn.expressions)
                )
              );
            }
          }
        },
      },
      // Remove unreachable code
      // Code after a return/throw/break/continue is unreachable
      // Remove implied returns
      // Remove code after if all branches are unreachable
      "Block|SwitchCase": {
        enter(path) {
          if (path.isProgram()) {
            path.scope.crawl();
          }
        },
        exit(path) {
          var statementList = path.isBlock()
            ? (path.get("body") as NodePath<t.Statement>[])
            : (path.get("consequent") as NodePath<t.Statement>[]);

          var impliedReturn: NodePath<t.ReturnStatement>;

          function isUnreachable(
            statementList: NodePath<t.Statement>[],
            topLevel = false
          ) {
            var unreachableState = false;

            for (var statement of statementList) {
              if (unreachableState) {
                statement.remove();
                continue;
              }

              if (statement.isIfStatement()) {
                const consequent = statement.get("consequent");
                const alternate = statement.get("alternate");

                if (
                  [consequent, alternate].every(
                    (x) =>
                      x.node &&
                      x.isBlockStatement() &&
                      isUnreachable(x.get("body"))
                  )
                ) {
                  unreachableState = true;
                  if (!topLevel) {
                    return true;
                  } else {
                    continue;
                  }
                }
              }

              if (statement.isSwitchStatement()) {
                // Can only remove switch statements if all cases are unreachable
                // And all paths are exhausted
                const cases = statement.get("cases");
                const hasDefaultCase = cases.some((x) => !x.node.test);
                if (
                  hasDefaultCase &&
                  cases.every((x) => isUnreachable(x.get("consequent")))
                ) {
                  unreachableState = true;
                  if (!topLevel) {
                    return true;
                  } else {
                    continue;
                  }
                }
              }

              if (
                statement.isReturnStatement() ||
                statement.isThrowStatement() ||
                statement.isBreakStatement() ||
                statement.isContinueStatement()
              ) {
                unreachableState = true;
                if (!topLevel) {
                  return true;
                }
              }

              if (topLevel) {
                if (
                  statement == statementList.at(-1) &&
                  statement.isReturnStatement() &&
                  !statement.node.argument
                ) {
                  impliedReturn = statement;
                }
              }
            }
            return false;
          }

          isUnreachable(statementList, true);

          if (impliedReturn) {
            var functionParent = path.getFunctionParent();
            if (
              functionParent &&
              t.isBlockStatement(functionParent.node.body) &&
              functionParent.node.body === path.node
            ) {
              impliedReturn.remove();
            }
          }
        },
      },
    },
  };
};
