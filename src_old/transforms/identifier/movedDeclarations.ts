import Transform from "../transform";
import { isBlock } from "../../traverse";
import {
  ExpressionStatement,
  AssignmentExpression,
  Identifier,
  Node,
  VariableDeclarator,
  AssignmentPattern,
} from "../../util/gen";
import {
  isForInitialize,
  isFunction,
  isStrictModeFunction,
  prepend,
} from "../../util/insert";
import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { choice } from "../../util/random";
import { predictableFunctionTag } from "../../constants";
import { isIndependent, isMoveable } from "../../util/compare";
import { getFunctionParameters } from "../../util/identifiers";
import { isLexicalScope } from "../../util/scope";

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
      var blockIndex = parents.findIndex((x) => isLexicalScope(x));
      var block = parents[blockIndex];
      var body: Node[] =
        block.type === "SwitchCase" ? block.consequent : block.body;
      ok(Array.isArray(body), "No body array found.");

      var bodyObject = parents[blockIndex - 2] || object;
      var index = body.indexOf(bodyObject);

      var varName = object.declarations[0].id.name;
      ok(typeof varName === "string");

      var predictableFunctionIndex = parents.findIndex((x) => isFunction(x));
      var predictableFunction = parents[predictableFunctionIndex];

      var deleteStatement = false;

      if (
        predictableFunction &&
        ((predictableFunction.id &&
          predictableFunction.id.name.includes(predictableFunctionTag)) ||
          predictableFunction[predictableFunctionTag]) && // Must have predictableFunctionTag in the name, or on object
        predictableFunction[predictableFunctionTag] !== false && // If === false, the function is deemed not predictable
        predictableFunction.params.length < 1000 && // Max 1,000 parameters
        !predictableFunction.params.find((x) => x.type === "RestElement") && // Cannot add parameters after spread operator
        !(
          ["Property", "MethodDefinition"].includes(
            parents[predictableFunctionIndex + 1]?.type
          ) && parents[predictableFunctionIndex + 1]?.kind !== "init"
        ) && // Preserve getter/setter methods
        !getFunctionParameters(
          predictableFunction,
          parents.slice(predictableFunctionIndex)
        ).find((entry) => entry[0].name === varName) // Ensure not duplicate param name
      ) {
        // Use function f(..., x, y, z) to declare name

        var value = object.declarations[0].init;
        var isPredictablyComputed =
          predictableFunction.body === block &&
          !isStrictModeFunction(predictableFunction) &&
          value &&
          isIndependent(value, []) &&
          isMoveable(value, [object.declarations[0], object, ...parents]);

        var defineWithValue = isPredictablyComputed;

        if (defineWithValue) {
          predictableFunction.params.push(
            AssignmentPattern(Identifier(varName), value)
          );
          object.declarations[0].init = null;
          deleteStatement = true;
        } else {
          predictableFunction.params.push(Identifier(varName));
        }
      } else {
        // Use 'var x, y, z' to declare name

        // Make sure in the block statement, and not already at the top of it
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

        // Add `var x` at the top of the block
        topVariableDeclaration.declarations.push(
          VariableDeclarator(Identifier(varName))
        );
      }

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
        if (deleteStatement && index !== -1) {
          body.splice(index, 1);
        } else {
          // Replace `var x = value` to `x = value`
          this.replace(object, ExpressionStatement(assignmentExpression));
        }
      }
    };
  }
}
