import Transform from "../transform";
import { isBlock } from "../../traverse";
import {
  ExpressionStatement,
  AssignmentExpression,
  Identifier,
  Node,
  VariableDeclarator,
} from "../../util/gen";
import { isForInitialize, prepend } from "../../util/insert";
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
    return (
      object.type === "VariableDeclaration" &&
      object.kind === "var" &&
      object.declarations.length === 1 &&
      object.declarations[0].id.type === "Identifier"
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var forInitializeType = isForInitialize(object, parents);

      // Get the block statement or Program node
      var blockIndex = parents.findIndex((x) => isBlock(x));
      var block = parents[blockIndex];
      var body = block.body;
      var bodyObject = parents[blockIndex - 2] || object;

      // Make sure in the block statement, and not already at the top of it
      var index = body.indexOf(bodyObject);
      if (index === -1 || index === 0) return;

      var topVariableDeclaration;
      if (body[0].type === "VariableDeclaration" && body[0].kind === "var") {
        topVariableDeclaration = body[0];
      } else {
        topVariableDeclaration = {
          type: "VariableDeclaration",
          declarations: [],
          kind: "var",
        };

        prepend(block, topVariableDeclaration);
      }

      var varName = object.declarations[0].id.name;
      ok(typeof varName === "string");

      // Add `var x` at the top of the block
      topVariableDeclaration.declarations.push(
        VariableDeclarator(Identifier(varName))
      );

      var assignmentExpression = AssignmentExpression(
        "=",
        Identifier(varName),
        object.declarations[0].init || Identifier(varName)
      );

      if (forInitializeType) {
        if (forInitializeType === "initializer") {
          // Replace `for (var i = 0...)` to `for (i = 0...)`
          this.replace(object, assignmentExpression);
        } else if (forInitializeType === "left-hand") {
          // Replace `for (var k in...)` to `for (k in ...)`

          this.replace(object, Identifier(varName));
        }
      } else {
        // Replace `var x = value` to `x = value`
        this.replace(object, ExpressionStatement(assignmentExpression));
      }
    };
  }
}
