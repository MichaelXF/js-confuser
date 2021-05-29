import { ok } from "assert";
import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import Template from "../templates/template";
import { walk } from "../traverse";
import {
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
  WhileStatement,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import {
  clone,
  getContext,
  isContext,
  isFunction,
  prepend,
} from "../util/insert";
import Transform from "./transform";

export default class Stack extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.Stack);
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) && !object.params.find((x) => x.type !== "Identifier")
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var identifiers: Location[] = [];

      var firstReference: { [name: string]: Node } = Object.create(null);
      var lastReference: { [name: string]: Node } = Object.create(null);

      var paramNames = object.params.map((x) => x.name);

      var defined = new Set<string>(paramNames);
      var references = new Set<string>();
      var illegal = new Set<string>();

      walk(object.body, [object, ...parents], (o, p) => {
        if (
          o.type == "Identifier" &&
          !reservedIdentifiers.has(o.name) &&
          !this.options.globalVariables.has(o.name)
        ) {
          var info = getIdentifierInfo(o, p);
          if (info.isFunctionParameter) {
            illegal.add(o.name);
          } else if (
            info.spec.isReferenced ||
            info.spec.isDefined ||
            info.spec.isModified
          ) {
            identifiers.push([o, p]);
            lastReference[o.name] = o;

            // console.log(o.name, info.spec);
            var isParam = paramNames.includes(o.name);
            if (!firstReference[o.name]) {
              if (!info.spec.isDefined && !isParam) {
                illegal.add(o.name);
              }
              firstReference[o.name] = o;
            } else if (info.spec.isDefined && !isParam) {
              illegal.add(o.name);
            }

            if (info.spec.isDefined) {
              defined.add(o.name);
            } else {
              references.add(o.name);
            }
          }
        }
      });

      references.forEach((ref) => {
        if (!defined.has(ref) || illegal.has(ref)) {
          identifiers = identifiers.filter((x) => x[0].name !== ref);
        }
      });

      // console.log(object.id.name, identifiers.length);

      if (!identifiers.length) {
        return;
      }

      var stackName = this.getPlaceholder();

      // stack is default all params in an array
      var mappings: string[] = [...paramNames];

      for (var i = 0; i < identifiers.length; i++) {
        var [varNode, varParents] = identifiers[i];
        ok(varNode.type === "Identifier");
        ok(typeof varNode.name === "string");

        var isFirstTimeUsed = firstReference[varNode.name] === varNode;
        var isLastTimeUsed = lastReference[varNode.name] === varNode;

        var isParam = paramNames.includes(varNode.name);

        var index = mappings.findIndex((x) => x === varNode.name);
        if (index === -1) {
          index = undefined;

          if (isFirstTimeUsed) {
            index = mappings.length;
            mappings.push(varNode.name);
          }
        }

        var isFirstIndex =
          mappings.length === 0 || mappings[0] === varNode.name;
        var isLastIndex =
          mappings.length === 0 ||
          mappings[mappings.length - 1] === varNode.name;

        var varNodeContext =
          varParents[0].type == "FunctionDeclaration" &&
          varParents[0].id == varNode
            ? getContext(varParents[0], varParents.slice(1))
            : getContext(varNode, varParents);

        var contextIndex = varParents.findIndex(
          (x) => isContext(x) && x === object
        );
        var slicedParents = varParents.slice(0, contextIndex);

        ok(!slicedParents.includes(object), "slicedParents includes object");

        var slicedTypes = new Set(slicedParents.map((x) => x.type));

        var isBranch = varNodeContext !== object;
        if (!isBranch) {
          if (
            [
              "IfStatement",
              "ForStatement",
              "ForInStatement",
              "ForOfStatement",
              "SwitchStatement",
              "ConditionalExpression",
              "LogicalExpression",
            ].find((x) => slicedTypes.has(x))
          ) {
            isBranch = true;
          }
        }

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

          var replacing = varNode;
          var value;

          if (
            varParents[0].type == "VariableDeclarator" &&
            varParents[0].id === varNode
          ) {
            if (!varParents[0].init) {
              varParents[0].init = Identifier("undefined");
            }
            replacing = varParents[0].init;
            value = { ...varParents[0].init };

            if (varParents[2] && varParents[2].type == "VariableDeclaration") {
              if (varParents[2].declarations.length === 1) {
                replacing = Identifier("undefined");

                this.replace(varParents[2], ExpressionStatement(replacing));
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
            this.replace(varParents[0], ExpressionStatement(emptyNode));
            replacing = emptyNode;
          } else if (
            varParents[0].type == "ClassDeclaration" &&
            varParents[0].id === varNode
          ) {
            value = {
              ...varParents[0],
              type: "ClassExpression",
              id: null,
              expression: null,
            };

            var emptyNode = Identifier("undefined");
            this.replace(varParents[0], ExpressionStatement(emptyNode));
            replacing = emptyNode;
          }

          if ((isFirstIndex || isLastIndex) && !isBranch) {
            this.replace(
              replacing,
              CallExpression(
                MemberExpression(
                  Identifier(stackName),
                  Identifier(isFirstIndex ? "unshift" : "push"),
                  false
                ),
                [value || Identifier("undefined")]
              )
            );
          } else {
            this.replace(
              replacing,
              AssignmentExpression(
                "=",
                MemberExpression(Identifier(stackName), Literal(index), true),
                value || Identifier("undefined")
              )
            );
          }
          continue;
        }

        if (isLastTimeUsed) {
          if (typeof index !== "number") {
            throw new Error("trying release variable with unknown index");
          }

          // remove from array

          mappings = mappings.filter((x) => x !== varNode.name);

          if ((isFirstIndex || isLastIndex) && !isBranch) {
            // console.log(varNode.name, "->", isFirstIndex ? "shift" : "pop");
            this.replace(
              varNode,
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
            varNode,
            MemberExpression(Identifier(stackName), Literal(index), true)
          );
        }
      }

      object.params = [SpreadElement(Identifier(stackName))];

      if (paramNames.length) {
        prepend(
          object.body,
          Template(`
          ${stackName}.length = ${paramNames.length};
        `).single()
        );
      }
    };
  }
}
