import { ok } from "assert";
import { ObfuscateOrder } from "../obfuscator";
import Template from "../templates/template";
import { walk } from "../traverse";
import {
  FunctionDeclaration,
  Identifier,
  ReturnStatement,
  FunctionExpression,
  SwitchStatement,
  VariableDeclaration,
  VariableDeclarator,
  CallExpression,
  MemberExpression,
  ThisExpression,
  ArrayExpression,
  SwitchCase,
  Literal,
  ExpressionStatement,
  BreakStatement,
  AssignmentExpression,
  Location,
  Node,
} from "../util/gen";
import { getDefiningIdentifier, getIdentifierInfo } from "../util/identifiers";
import {
  getBlockBody,
  getContext,
  isContext,
  isFunction,
  prepend,
} from "../util/insert";
import Transform, { reservedIdentifiers } from "./transform";

/**
 * Brings every function to the global level.
 *
 * Functions take parameters, input, have a return value and return modified changes to the scoped variables.
 */
export default class Flatten extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Flatten);
  }

  match(object, parents) {
    return isContext(object) && object.type != "Program";
  }

  transform(context, contextParents) {
    ok(isContext(context));

    return () => {
      var executorName;

      var prepareCases = [];
      var unloadCases = [];

      var resultName = this.getPlaceholder();
      var argsName = this.getPlaceholder();

      const makeExecutorFunction = () => {
        if (!executorName) {
          executorName = "execute" + this.getPlaceholder();
          prepend(
            context,
            FunctionDeclaration(
              executorName,
              [Identifier("fn"), Identifier("methodIndex")],
              [
                ReturnStatement(
                  FunctionExpression(
                    [],
                    [
                      Template(
                        `var ${argsName} = Array.prototype.slice.call(arguments);`
                      ).single(),
                      SwitchStatement(Identifier("methodIndex"), prepareCases),
                      VariableDeclaration(
                        VariableDeclarator(
                          resultName,
                          CallExpression(
                            MemberExpression(
                              Identifier("fn"),
                              Identifier("apply"),
                              false
                            ),
                            [ThisExpression(), Identifier(argsName)]
                          )
                        )
                      ),
                      SwitchStatement(Identifier("methodIndex"), unloadCases),

                      ReturnStatement(
                        CallExpression(
                          MemberExpression(
                            Identifier(resultName),
                            Identifier("pop"),
                            false
                          ),
                          []
                        )
                      ),
                    ]
                  )
                ),
              ]
            )
          );
        }
      };

      var functionsChanged = new Set<string>();
      var newNames: { [originalName: string]: string } = Object.create(null);
      var methods: {
        [newName: string]: {
          referenced: Set<string>;
          modified: Set<string>;
          index: number;
        };
      } = Object.create(null);

      walk(context, contextParents, (object, parents) => {
        if (
          object != context &&
          isFunction(object) &&
          getContext(parents[0], parents.slice(1)) == context &&
          !object.$rgf
        ) {
          return () => {
            var params = new Set<string>();

            walk(object.params, [object, ...parents], (o, p) => {
              if (
                o.type == "Identifier" &&
                getContext(o, p) == object &&
                !reservedIdentifiers.has(o.name)
              ) {
                params.add(o.name);
              }
            });

            // console.log(object?.id?.name, params);

            var referenced = new Set<string>();
            var modified = new Set<string>();
            var definedTopLevel = new Set<string>();

            var returnStatements: Location[] = [];

            getBlockBody(object.body).push(ReturnStatement());

            walk(object.body, [object, ...parents], (o, p) => {
              if (o.type == "Identifier" && !reservedIdentifiers.has(o.name)) {
                var info = getIdentifierInfo(o, p);

                if (info.spec.isDefined) {
                  var definingContext = getContext(o, p);
                  if (info.isFunctionDeclaration) {
                    definingContext = getContext(p[1], p.slice(2));
                  }
                  if (definingContext == object) {
                    definedTopLevel.add(o.name);
                  } else {
                  }
                } else if (info.spec.isModified || info.spec.isReferenced) {
                  var definedAt = getDefiningIdentifier(o, p);
                  if (definedAt) {
                    // for variables defined inside the function, no external reference needed
                    if (definedAt[1].includes(object)) {
                      return;
                    }
                  }

                  if (info.spec.isModified) {
                    modified.add(o.name);
                  }
                  if (info.spec.isReferenced) {
                    referenced.add(o.name);
                  }
                }
              }

              if (o.type == "ReturnStatement") {
                if (getContext(o, p) == object) {
                  returnStatements.push([o, p]);
                }
              }
            });

            // console.log(object?.id?.name, params, modified, referenced);

            params.forEach((x) => {
              modified.delete(x);
              referenced.delete(x);
            });

            definedTopLevel.forEach((identifier) => {
              modified.delete(identifier);
              referenced.delete(identifier);
            });

            modified.forEach((identifier) => {
              referenced.delete(identifier);
            });

            this.options.globalVariables.forEach((identifier) => {
              if (!params.has(identifier) && !definedTopLevel.has(identifier)) {
                referenced.delete(identifier);
              }
            });

            returnStatements.forEach(([returnStatement, p]) => {
              returnStatement.argument = ArrayExpression([
                ...Array.from(modified).map((name) => {
                  return Identifier(name);
                }),
                returnStatement.argument || Identifier("undefined"),
              ]);
            });

            var newName =
              this.getPlaceholder() + "_" + (object?.id?.name || "_");

            var methodIndex = Object.keys(methods).length;
            methods[object?.id?.name] = {
              referenced: referenced,
              modified: modified,
              index: methodIndex,
            };

            if (referenced.size || modified.size) {
              prepareCases.push(
                SwitchCase(Literal(methodIndex), [
                  ...[...modified, ...referenced].reverse().map((identifer) => {
                    return ExpressionStatement(
                      CallExpression(
                        MemberExpression(
                          Identifier(argsName),
                          Identifier("unshift"),
                          false
                        ),
                        [Identifier(identifer)]
                      )
                    );
                  }),
                  BreakStatement(),
                ])
              );
            }

            if (modified.size) {
              unloadCases.push(
                SwitchCase(Literal(methodIndex), [
                  ...Array.from(modified).map((identifer, i) => {
                    return ExpressionStatement(
                      AssignmentExpression(
                        "=",
                        Identifier(identifer),
                        MemberExpression(
                          Identifier(resultName),
                          Literal(i),
                          true
                        )
                      )
                    );
                  }),
                  BreakStatement(),
                ])
              );
            }

            var globalFn: Node = FunctionDeclaration(
              newName,
              [
                ...Array.from(modified).map((x) => Identifier(x)),
                ...Array.from(referenced).map((x) => Identifier(x)),
                ...Array.from(params).map((x) => Identifier(x)),
              ],
              object.expression ? [object.body] : getBlockBody(object.body)
            );

            globalFn.$rgf = true;

            prepend(
              contextParents[contextParents.length - 1] || context,
              globalFn
            );

            object.$rgf = true;

            if (object.type == "FunctionDeclaration") {
              functionsChanged.add(object.id.name);

              if (Array.isArray(parents[0])) {
                // console.log("Deleted", object.id.name, "->", newName);
                parents[0].splice(parents[0].indexOf(object), 1);

                newNames[object.id.name] = newName;
              } else {
                // ?
              }
            } else {
              makeExecutorFunction();

              this.replace(
                object,
                CallExpression(Identifier(executorName), [
                  Identifier(newName),
                  Literal(methodIndex),
                ])
              );
            }
          };
        }
      });

      walk(context, contextParents, (object, parents) => {
        if (object.type == "Identifier" && newNames[object.name]) {
          var info = getIdentifierInfo(object, parents);
          if (info.spec.isReferenced) {
            if (!info.spec.isDefined || !info.spec.isModified) {
              makeExecutorFunction();

              this.replace(
                object,
                CallExpression(Identifier(executorName), [
                  Identifier(newNames[object.name]),
                  Literal(methods[object.name]?.index),
                ])
              );
            }
          }
        }
      });
    };
  }
}
