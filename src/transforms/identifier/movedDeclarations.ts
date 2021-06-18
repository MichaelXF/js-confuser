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
      var switchCaseIndex = parents.findIndex((x) => x.type == "SwitchCase");
      if (switchCaseIndex != -1) {
        this.log("(Switch Edge Case)", varNames);
      }

      var block = getBlock(object, parents);

      var varDecs: Location[] = [];
      var varNames = new Set<string>();
      var illegal = new Set<string>();
      var toReplace: [string[], Node, Node][] = [];
      var definingIdentifiers = new Map<string, Node>();

      walk(object, parents, (o: Node, p: Node[]) => {
        if (o.type == "Identifier" && !illegal.has(o.name)) {
          var info = getIdentifierInfo(o, p);
          if (info.spec.isDefined && definingIdentifiers.has(o.name)) {
            illegal.add(o.name);
            this.log(o.name, "is illegal due to detected being redefined");
          }
          if (info.spec.isDefined && p.find((x) => x.type == "SwitchCase")) {
            illegal.add(o.name);
            this.log(o.name, "is illegal due being in switch case");
          }

          if (o.hidden) {
            illegal.add(o.name);
          }
        }

        var s = getBlock(o, p);
        if (s == block) {
          return () => {
            if (
              o.type == "VariableDeclaration" &&
              o.declarations.length &&
              o.kind !== "let" &&
              !o.declarations.find(
                (x) => x.id.type !== "Identifier" || illegal.has(x.id.name)
              )
            ) {
              var index = block.body.indexOf(o);
              if (index === 0 || o.hidden) {
                o.declarations.forEach((x) => {
                  illegal.add(x.id.name);
                });
                this.log(
                  o.declarations.map((x) => x.id.name).join(", "),
                  "is/are illegal due to already being at the top"
                );
                return;
              }

              if (isForInitialize(o, p)) {
                this.log(
                  o.declarations.map((x) => x.id.name).join(", "),
                  "is/are illegal due to being in for initializer"
                );
                return;
              }

              var isIllegal = false;
              o.declarations.forEach((x) => {
                if (varNames.has(x.id.name)) {
                  illegal.add(x.id.name);
                  isIllegal = true;

                  this.log(
                    x.id.name,
                    "is illegal due to already being defined"
                  );
                }
              });

              if (!isIllegal) {
                varDecs.push([o, p]);

                o.declarations.forEach((x) => {
                  ok(x.id.name);
                  varNames.add(x.id.name);

                  definingIdentifiers.set(x.id.name, x.id);
                });

                // Change this line to assignment expressions

                var assignmentExpressions = o.declarations.map((x) =>
                  AssignmentExpression(
                    "=",
                    clone(x.id),
                    clone(x.init) || Identifier("undefined")
                  )
                );

                ok(assignmentExpressions.length, "Should be at least 1");

                var value: Node = SequenceExpression(assignmentExpressions);

                value = ExpressionStatement(value);

                toReplace.push([
                  o.declarations.map((x) => x.id.name),
                  o,
                  value,
                ]);
              }
            }
          };
        }
      });

      illegal.forEach((name) => {
        varNames.delete(name);
      });

      toReplace.forEach((x) => {
        if (!x[0].find((x) => illegal.has(x))) {
          this.replace(x[1], x[2]);
        }
      });

      // Define the names in this block as 1 variable declaration
      if (varNames.size > 0) {
        this.log("Moved", varNames);

        var variableDeclaration = VariableDeclaration(
          Array.from(varNames).map((x) => {
            return VariableDeclarator(x);
          })
        );

        prepend(block, variableDeclaration);
      }
    };
  }
}
