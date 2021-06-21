import Transform from "../transform";
import { isBlock, getBlock, walk } from "../../traverse";
import {
  Location,
  ExpressionStatement,
  SequenceExpression,
  AssignmentExpression,
  Identifier,
  Node,
  VariableDeclaration,
  VariableDeclarator,
} from "../../util/gen";
import { clone, isForInitialize, isFunction, prepend } from "../../util/insert";
import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { getIdentifierInfo } from "../../util/identifiers";
import { isLoop } from "../../util/compare";
import { reservedIdentifiers } from "../../constants";

/**
 * Defines all the names at the top of every lexical block.
 */
export default class MovedDeclarations extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.MovedDeclarations);
  }

  match(object, parents) {
    return isBlock(object) && (!parents[0] || !isLoop(parents[0]));
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var block = getBlock(object, parents);

      var varDecs: Location[] = [];
      var varNames = new Set<string>();
      var illegal = new Set<string>();
      var toReplace: [string[], Node, Node][] = [];
      var definingIdentifiers = new Map<string, Node>();

      walk(object, parents, (o: Node, p: Node[]) => {
        if (
          o.type == "Identifier" &&
          !reservedIdentifiers.has(o.name) &&
          !this.options.globalVariables.has(o.name) &&
          !illegal.has(o.name)
        ) {
          var info = getIdentifierInfo(o, p);
          if (!info.spec.isReferenced) {
            return;
          }

          if (o.hidden) {
            illegal.add(o.name);
          } else if (info.spec.isDefined) {
            if (
              definingIdentifiers.has(o.name) ||
              p.find((x) => x.type == "SwitchCase")
            ) {
              illegal.add(o.name);
            }
          }
        }

        if (
          o.type == "VariableDeclaration" &&
          o.declarations.length &&
          o.kind === "var" &&
          !o.declarations.find(
            (x) => x.id.type !== "Identifier" || illegal.has(x.id.name)
          )
        ) {
          var s = getBlock(o, p);
          if (s != block) {
            return;
          }
          return () => {
            var index = block.body.indexOf(o);
            if (index === 0 || o.hidden) {
              o.declarations.forEach((x) => {
                illegal.add(x.id.name);
              });
              return;
            }

            if (isForInitialize(o, p)) {
              return;
            }

            var isIllegal = false;
            o.declarations.forEach((x) => {
              if (varNames.has(x.id.name)) {
                illegal.add(x.id.name);
                isIllegal = true;

                this.log(x.id.name, "is illegal due to already being defined");
              }
            });

            if (!isIllegal) {
              varDecs.push([o, p]);

              var names = [];

              o.declarations.forEach((x) => {
                ok(x.id.name);
                varNames.add(x.id.name);

                names.push(x.id.name);

                definingIdentifiers.set(x.id.name, x.id);
              });

              // Change this line to assignment expressions

              var assignmentExpressions = o.declarations.map((x) =>
                AssignmentExpression(
                  "=",
                  Identifier(x.id.name),
                  clone(x.init) || Identifier("undefined")
                )
              );

              ok(assignmentExpressions.length, "Should be at least 1");

              var value: Node = SequenceExpression(assignmentExpressions);

              value = ExpressionStatement(value);

              toReplace.push([names, o, value]);
            }
          };
        }
      });

      illegal.forEach((name) => {
        varNames.delete(name);
      });

      toReplace.forEach(([names, node1, node2]) => {
        if (!names.find((name) => illegal.has(name))) {
          this.replace(node1, node2);
        }
      });

      // Define the names in this block as 1 variable declaration
      if (varNames.size > 0) {
        this.log("Moved", varNames);

        var variableDeclaration = VariableDeclaration(
          Array.from(varNames).map((name) => {
            return VariableDeclarator(name);
          })
        );

        prepend(block, variableDeclaration);
      }
    };
  }
}
