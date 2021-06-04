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

/**
 * Defines all the names at the top of every lexical block.
 */
export default class MovedDeclarations extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.MovedDeclarations);
  }

  match(object, parents) {
    return isBlock(object);
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var switchCaseIndex = parents.findIndex((x) => x.type == "SwitchCase");
      if (switchCaseIndex != -1) {
        this.log("(Switch Edge Case)", varNames);
      }

      var block = getBlock(object, parents);

      var varDecs: Location[] = [];
      var varNames: Set<string> = new Set();

      walk(object, parents, (o: Node, p: Node[]) => {
        var s = getBlock(o, p);
        if (s != block) {
          return;
        }
        return () => {
          if (
            o.type == "VariableDeclaration" &&
            o.declarations.length &&
            o.kind !== "let"
          ) {
            if (isForInitialize(o, p)) {
              return;
            }

            varDecs.push([o, p]);

            o.declarations.forEach((declarator) => {
              walk(declarator.id, [declarator, ...p], (dO, dP) => {
                if (dO.type == "Identifier") {
                  var info = getIdentifierInfo(dO, dP);
                  if (info.spec.isReferenced) {
                    varNames.add(dO.name);
                  }
                }
              });
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

            this.replace(o, value);
          }
        };
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
