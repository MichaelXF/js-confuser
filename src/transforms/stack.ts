import { ok } from "assert";
import { stringify } from "querystring";
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
  RestElement,
  SequenceExpression,
  SpreadElement,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../util/gen";
import {
  getDefiningIdentifier,
  getIdentifierInfo,
  validateChain,
} from "../util/identifiers";
import {
  clone,
  getVarContext,
  isVarContext,
  isForInitialize,
  isFunction,
  isInBranch,
  prepend,
} from "../util/insert";
import { getRandomInteger } from "../util/random";
import Transform from "./transform";

export default class Stack extends Transform {
  made: number;

  constructor(o) {
    super(o, ObfuscateOrder.Stack);

    this.made = 0;
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
      var possible = true;
      walk(object, parents, (o, p) => {
        if (o.type == "VariableDeclaration" && o.declarations.length > 1) {
          possible = false;
          return "EXIT";
        }
      });
      if (!possible) {
        return;
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
        location: Location;
        value?: Node;
        replacing?: Node;
        isDefiningNode?: boolean;
      }[] = [];
      var definingNodes = new Map<Node, Node>();
      var lastReference = new Map<Node, Node>();

      var branchMap = new Map<Node, boolean>();
      var illegal = new Set<string>();
      var queuedReplacements = [];

      const checkBranch = (o, p, definingNode) => {
        var isBranch = branchMap.get(definingNode) || isInBranch(o, p, object);
        if (isBranch) {
          branchMap.set(definingNode, true);
        }
      };

      walk(object, parents, (o, p) => {
        if (o.type == "VariableDeclaration") {
          return () => {
            var elements = [];
            var names = new Set<string>();
            var forInit = isForInitialize(o, p);

            o.declarations.forEach((x) => {
              if (x.id.type == "Identifier") {
                var replacing = Literal(0);
                elements.push(replacing);

                var varParents = [x, o.declarations, o, ...p];
                identifiers.push({
                  location: [x.id, varParents],
                  value: x.init || (!forInit && Identifier("undefined")),
                  replacing: replacing,
                });

                definingNodes.set(x.id, x.id);
                names.add(x.id.name);
                checkBranch(x.id, varParents, x.id);
              }
            });

            var expr: Node = SequenceExpression(elements);
            if (!forInit) {
              expr = ExpressionStatement(expr);
            }

            queuedReplacements.push([o, expr, names]);
          };
        }
        if (o !== object && o.type == "FunctionDeclaration") {
          return () => {
            var value = {
              ...o,
              type: "FunctionExpression",
              expression: false,
              id: null,
            };
            var replacing = Literal(0);

            identifiers.push({
              location: [o.id, [o, ...p]],
              replacing: replacing,
              value: value,
            });
            definingNodes.set(o.id, o.id);
            checkBranch(o.id, [o, ...p], o.id);

            queuedReplacements.push([
              o,
              ExpressionStatement(replacing),
              new Set([o.id.name]),
            ]);
          };
        }
        if (o !== object && o.type == "ClassDeclaration") {
          return () => {
            var value = {
              ...o,
              type: "ClassDeclaration",
            };
            var replacing = Literal(0);

            identifiers.push({
              location: [o.id, [o, ...p]],
              replacing: replacing,
              value: value,
            });
            definingNodes.set(o.id, o.id);
            checkBranch(o.id, [o, ...p], o.id);

            queuedReplacements.push([
              o,
              ExpressionStatement(replacing),
              new Set([o.id.name]),
            ]);
          };
        }

        if (
          o !== object.id &&
          o.type == "Identifier" &&
          !reservedIdentifiers.has(o.name) &&
          !this.options.globalVariables.has(o.name)
        ) {
          var sliced = p.slice(0, p.indexOf(object));
          var varIndex = sliced.findIndex(
            (x) => x.type == "VariableDeclarator"
          );
          if (
            varIndex !== -1 &&
            sliced[varIndex].id == (sliced[varIndex - 1] || o)
          ) {
            return;
          }

          var info = getIdentifierInfo(o, p);
          if (info.spec.isDefined || info.spec.isReferenced) {
            if (info.isFunctionDeclaration || info.isClassDeclaration) {
              return;
            }
            if (info.isFunctionParameter) {
              var fn = p.find((x) => isFunction(x));
              if (fn == object) {
              } else {
                illegal.add(o.name);
              }
              return;
            }
            if (info.isClauseParameter) {
              illegal.add(o.name);
              return;
            }

            var definingNode = info.spec.isDefined ? o : null;

            if (!definingNode) {
              var location = getDefiningIdentifier(o, p);
              if (location && location[1].includes(object)) {
                definingNode = location[0];
              }
            }

            if (definingNode) {
              definingNodes.set(o, definingNode);

              lastReference.set(definingNode, o);
              identifiers.push({ location: [o, p] });
            }
          }
        }
      });

      illegal.forEach((bad) => {
        identifiers = identifiers.filter((x) => x.location[0].name !== bad);
      });

      if (!identifiers.length) {
        return;
      }

      queuedReplacements.forEach((x) => {
        var can = true;
        x[2].forEach((x) => {
          if (illegal.has(x)) {
            // console.log(x);
            can = false;
          }
        });
        if (can) {
          this.replace(x[0], x[1]);
        }
      });

      // console.log(illegal);

      var mappings: string[] = [...object.params.map((x) => x.name)];

      // Array(getRandomInteger(1, 4))
      //   .fill(0)
      //   .forEach((x) => {
      //     mappings.push(this.getPlaceholder());
      //   });

      var startingSize = mappings.length;
      var stackName = this.getPlaceholder();

      for (var identifier of identifiers) {
        var { location, value, replacing, isDefiningNode } = identifier;
        var [varNode, varParents] = location;

        if (!replacing) {
          replacing = varNode;
        }

        if (illegal.has(varNode.name)) {
          continue;
        }

        var index = mappings.indexOf(varNode.name);

        var definingNode = definingNodes.get(varNode);
        var exitingNode = lastReference.get(definingNode);

        var isFirstTimeUsed = isDefiningNode || definingNode == varNode;
        var isLastTimeUsed = exitingNode == varNode;

        var isBranch = branchMap.get(definingNode);

        if (index == -1) {
          index = mappings.length;
          mappings.push(varNode.name);
        }

        var isFirstIndex = index === 0;
        var isLastIndex = index === mappings.length - 1;

        // console.log(varNode, definingNode, exitingNode);
        // console.log({
        //   name: varNode.name,
        //   isFirstIndex,
        //   isLastIndex,
        //   isFirstTimeUsed,
        //   isLastTimeUsed,
        // });

        var lastShortcut =
          isLastTimeUsed &&
          !isBranch &&
          (isFirstIndex ? "shift" : isLastIndex ? "pop" : null);
        var firstShortcut =
          isFirstTimeUsed &&
          !isBranch &&
          (isFirstIndex ? "unshift" : isLastIndex ? "push" : null);

        if (
          varParents[0].type == "AssignmentExpression" &&
          varParents[0].operator == "=" &&
          varParents[0].left === varNode
        ) {
          value = varParents[0].right;
          replacing = varParents[0];
        }

        if (value && firstShortcut) {
          this.replace(
            replacing,
            CallExpression(
              MemberExpression(
                Identifier(stackName),
                Identifier(firstShortcut),
                false
              ),
              [clone(value)]
            )
          );
        } else if (lastShortcut) {
          mappings = mappings.filter((x) => x != varNode.name);
          this.replace(
            replacing,
            Template(`${stackName}.${lastShortcut}()`).single().expression
          );
        } else if (typeof index === "number") {
          if (value) {
            this.replace(
              replacing,
              AssignmentExpression(
                "=",
                MemberExpression(Identifier(stackName), Literal(index), true),
                clone(value) || Identifier("undefined")
              )
            );
          } else {
            this.replace(
              replacing,
              MemberExpression(Identifier(stackName), Literal(index), true)
            );
          }
        }
      }

      object.params = [RestElement(Identifier(stackName))];
      prepend(
        object.body,
        Template(`${stackName}.length = ${startingSize}`).single()
      );
    };
  }
}
