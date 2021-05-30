import { ok } from "assert";
import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import { walk } from "../traverse";
import {
  ArrayExpression,
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  ExpressionStatement,
  Identifier,
  Literal,
  Location,
  MemberExpression,
  Node,
  SpreadElement,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import {
  clone,
  getVarContext,
  isVarContext,
  isForInitialize,
  isFunction,
  isInBranch,
  prepend,
} from "../util/insert";
import Transform from "./transform";

export default class Stack extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Stack);
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) &&
      !object.params.find((x) => x.type !== "Identifier") &&
      object.body.type === "BlockStatement"
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      // SyntaxError: Illegal 'use strict' directive in function with non-simple parameter list

      for (var stmt of object.body.body) {
        if (stmt.type == "ExpressionStatement") {
          if (
            stmt.expression.type == "Literal" &&
            stmt.expression.value === "use strict"
          ) {
            return;
          }
        }
      }

      if (
        !ComputeProbabilityMap(
          this.options.stack,
          (x) => x,
          object.id && object.id.name
        )
      ) {
        return;
      }

      var identifiers: {
        type: "defined" | "modified" | "reference";
        location: Location;
        value?: Node;
        replacing?: Node;
      }[] = [];

      var firstReference: { [name: string]: Node } = Object.create(null);
      var lastReference: { [name: string]: Node } = Object.create(null);

      var paramNames = object.params.map((x) => x.name);

      var defined = new Set<string>(paramNames);
      var references = new Set<string>();
      var illegal = new Set<string>();

      var queuedReplaces = new Map<string, [Node, Node][]>();

      var scan = (varNode: Node, varParents: Node[]) => {
        if (
          varNode.type == "Identifier" &&
          !reservedIdentifiers.has(varNode.name) &&
          !this.options.globalVariables.has(varNode.name)
        ) {
          function queue(node1: Node, node2: Node) {
            if (!queuedReplaces.has(varNode.name)) {
              queuedReplaces.set(varNode.name, [[node1, node2]]);
            } else {
              queuedReplaces.get(varNode.name).push([node1, node2]);
            }
          }

          var info = getIdentifierInfo(varNode, varParents);

          if (info.isFunctionParameter || info.isClauseParameter) {
            illegal.add(varNode.name);
          } else if (
            info.spec.isReferenced ||
            info.spec.isDefined ||
            info.spec.isModified
          ) {
            var value;
            var replacing = varNode;

            if (info.spec.isDefined) {
              if (
                varParents[0].type == "VariableDeclarator" &&
                varParents[0].id === varNode
              ) {
                if (
                  varParents[2] &&
                  varParents[2].type == "VariableDeclaration"
                ) {
                  if (isForInitialize(varParents[2], varParents.slice(3))) {
                    illegal.add(varNode.name);
                    // queue(varParents[2], replacing);
                  } else if (varParents[2].declarations.length === 1) {
                    replacing = Identifier("undefined");
                    value = Identifier("undefined");
                    if (!varParents[0].init) {
                      varParents[0].init = Identifier("undefined");
                    }
                    replacing = varParents[0].init;
                    value = { ...varParents[0].init };
                    queue(varParents[2], ExpressionStatement(replacing));
                  } else if (varParents[2].declarations.length > 1) {
                    illegal.add(varNode.name);
                  }
                }
              } else if (
                varParents[0].type == "FunctionDeclaration" &&
                varParents[0].id === varNode
              ) {
                value = {
                  ...varParents[0],
                  type: "FunctionExpression",
                  id: null,
                  expression: false,
                };

                var emptyNode = Identifier("undefined");
                queue(varParents[0], ExpressionStatement(emptyNode));
                replacing = emptyNode;
              } else if (
                varParents[0].type == "ClassDeclaration" &&
                varParents[0].id === varNode
              ) {
                // console.log(varNode.name, varParents[0].type, info);

                value = {
                  ...varParents[0],
                  type: "ClassExpression",
                  expression: null,
                };

                var emptyNode = Identifier("undefined");
                queue(varParents[0], ExpressionStatement(emptyNode));
                replacing = emptyNode;
              } else {
                illegal.add(varNode.name);
              }
            }
            const type =
              info.spec.isDefined && value
                ? "defined"
                : info.spec.isModified
                ? "modified"
                : "reference";

            identifiers.push({
              location: [varNode, varParents],
              type: type,
              value: value,
              replacing: replacing,
            });
            lastReference[varNode.name] = varNode;

            // console.log(o.name, info.spec);
            var isParam = paramNames.includes(varNode.name);
            if (!firstReference[varNode.name]) {
              if (!info.spec.isDefined && !isParam) {
                illegal.add(varNode.name);
              }
              firstReference[varNode.name] = varNode;
            } else if (info.spec.isDefined && !isParam) {
              illegal.add(varNode.name);
            }

            if (info.spec.isDefined) {
              defined.add(varNode.name);
            } else {
              references.add(varNode.name);
            }

            if (
              info.spec.isModified &&
              parents.find((x) => x.type == "VariableDeclarator")
            ) {
              illegal.add(varNode.name);
            }
          }
        }
      };

      walk(object.body, [object, ...parents], (varNode, varParents) => {
        return () => {
          scan(varNode, varParents);
        };
      });

      references.forEach((ref) => {
        if (!defined.has(ref) || illegal.has(ref)) {
          identifiers = identifiers.filter((x) => x.location[0].name !== ref);
        }
      });
      illegal.forEach((illegal) => {
        queuedReplaces.delete(illegal);
        identifiers = identifiers.filter((x) => x.location[0].name !== illegal);
      });

      // console.log(object.id.name, identifiers.length);

      if (!identifiers.length) {
        return;
      }

      // console.log(defined);

      var rollback = clone(object);
      queuedReplaces.forEach((value) => {
        value.forEach(([node1, node2]) => {
          this.replace(node1, node2);
        });
      });

      var stackName = this.getPlaceholder();

      // stack is default all params in an array
      var mappings: string[] = [...paramNames];

      for (var i = 0; i < identifiers.length; i++) {
        var { type, location, value, replacing } = identifiers[i];
        var [varNode, varParents] = location;

        if (typeof varNode.name !== "string") {
          this.replace(object, rollback);
          return;
        }

        var isFirstTimeUsed = firstReference[varNode.name] === varNode;
        var isLastTimeUsed = lastReference[varNode.name] === varNode;

        var isParam = paramNames.includes(varNode.name);

        var index = mappings.findIndex((x) => x === varNode.name);
        if (index === -1) {
          index = undefined;

          if (isFirstTimeUsed) {
            index = mappings.length;
            mappings.push(varNode.name);
          } else {
            this.replace(object, rollback);
            return;
          }
        }

        var isFirstIndex =
          mappings.length === 0 || mappings[0] === varNode.name;
        var isLastIndex =
          mappings.length === 0 ||
          mappings[mappings.length - 1] === varNode.name;

        var isBranch = isInBranch(varNode, varParents, object);

        // console.log({
        //   name: varNode.name,
        //   index,
        //   isFirstTimeUsed,
        //   isLastTimeUsed,
        //   isFirstIndex,
        //   isLastIndex,
        //   isBranch,
        //   isParam,
        // });

        if (isFirstTimeUsed && !isParam) {
          // add to the array

          if (type == "defined") {
            ok(value);
            ok(replacing);

            if ((isFirstIndex || isLastIndex) && !isBranch) {
              this.replace(
                replacing,
                CallExpression(
                  MemberExpression(
                    Identifier(stackName),
                    Identifier(isFirstIndex ? "unshift" : "push"),
                    false
                  ),
                  [value]
                )
              );
              continue;
            }

            this.replace(
              replacing,
              AssignmentExpression(
                "=",
                MemberExpression(Identifier(stackName), Literal(index), true),
                value
              )
            );
            continue;
          }
        }

        if (isLastTimeUsed && typeof index === "number") {
          if ((isFirstIndex || isLastIndex) && !isBranch) {
            // remove from array

            mappings = mappings.filter((x) => x !== varNode.name);

            // console.log(varNode.name, "->", isFirstIndex ? "shift" : "pop");
            this.replace(
              replacing,
              CallExpression(
                MemberExpression(
                  Identifier(stackName),
                  Identifier(isFirstIndex ? "shift" : "pop"),
                  false
                ),
                []
              )
            );
            continue;
          }
        }

        if (typeof index === "number") {
          this.replace(
            replacing,
            MemberExpression(Identifier(stackName), Literal(index), true)
          );
        } else {
          this.replace(object, rollback);
          return;
        }
      }

      // if (paramNames.length) {
      object.params = [SpreadElement(Identifier(stackName))];
      prepend(
        object.body,
        Template(`
        ${stackName}.length = ${paramNames.length};
      `).single()
      );
      // } else {
      // prepend(
      //   object.body,
      //   VariableDeclaration(
      //     VariableDeclarator(Identifier(stackName), ArrayExpression([]))
      //   )
      // );
      // }
    };
  }
}
