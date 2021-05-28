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
import { prepend } from "../../util/insert";
import { ok } from "assert";
import { ObfuscateOrder } from "../../order";

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
      var block = getBlock(object, parents);

      var varDecs: Location[] = [];
      var varNames: Set<string> = new Set();

      walk(object, parents, (o: Node, p: Node[]) => {
        var s = getBlock(o, p);
        if (s != block) {
          return;
        }

        if (o.type == "VariableDeclaration" && o.declarations.length) {
          if (p[0].type == "ForStatement" && p[0].init == o) {
            return;
          }
          if (
            (p[0].type == "ForOfStatement" || p[0].type == "ForInStatement") &&
            p[0].left == o
          ) {
            return;
          }

          varDecs.push([o, p]);

          o.declarations.forEach((declarator) => {
            walk(declarator.id, [], (dO, dP) => {
              if (dO.type == "Identifier") {
                varNames.add(dO.name);
              }
            });
          });

          // Change this line to assignment expressions

          var assignmentExpressions = o.declarations.map((x) =>
            AssignmentExpression("=", x.id, x.init || Identifier("undefined"))
          );

          ok(assignmentExpressions.length, "Should be at least 1");

          var value: Node = SequenceExpression(assignmentExpressions);
          if (assignmentExpressions.length == 1) {
            // If only 1, then single assignment expression
            value = assignmentExpressions[0];
          }

          var forIndex = p.findIndex((x) => x.type == "ForStatement");
          var inFor =
            forIndex != -1 && p[forIndex].init == (p[forIndex - 1] || o);

          if (!inFor) {
            value = ExpressionStatement(value);
          }

          this.objectAssign(o, value);
        }
      });

      // Define the names in this block as 1 variable declaration
      if (varNames.size > 0) {
        this.log("Moved", varNames);

        var switchCaseIndex = parents.findIndex((x) => x.type == "SwitchCase");
        if (switchCaseIndex != -1) {
          this.log("(Switch Edge Case)", varNames);
        }

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
