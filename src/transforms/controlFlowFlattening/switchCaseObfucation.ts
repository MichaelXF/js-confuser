import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { ComputeProbabilityMap } from "../../probability";
import Template from "../../templates/template";
import { isBlock, walk } from "../../traverse";
import {
  AssignmentExpression,
  BinaryExpression,
  BreakStatement,
  ExpressionStatement,
  Identifier,
  IfStatement,
  Literal,
  Node,
  SwitchCase,
  SwitchStatement,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../../util/gen";
import { clone, getBlockBody, prepend } from "../../util/insert";
import {
  choice,
  getRandomInteger,
  getRandomTrueExpression,
  shuffle,
} from "../../util/random";
import Transform from "../transform";

/**
 * Does complex math to the state variable, after both CFF and CFO have run.
 *
 * The switch statements are ones with numbered cases and a single identifier discriminant.
 */
export default class SwitchCaseObfuscation extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return (
      object.type == "SwitchStatement" &&
      object.discriminant.type == "Identifier" &&
      !object.cases.find(
        (x) => !(x.test.type == "Literal" && typeof x.test.value === "number")
      )
    );
  }

  transform(object, parents) {
    var body = parents[0];

    if (parents[0].type == "LabeledStatement") {
      body = parents[1];
    }

    if (!Array.isArray(body)) {
      return;
    }

    var factor = getRandomInteger(-250, 250);
    if (factor == 0) {
      factor = 1;
    }
    var offset = getRandomInteger(-250, 250);

    var newVar = this.getPlaceholder();

    var newStates = [];
    object.cases.forEach((x) => {
      var current = x.test.value;
      var value = current * factor + offset;

      newStates.push(value);
    });

    if (new Set(newStates).size != newStates.length) {
      // not possible because of clashing case test
      return;
    }

    // State variable declaration
    body.unshift(
      VariableDeclaration(
        VariableDeclarator(
          newVar,
          Template(
            `${object.discriminant.name} * ${factor} + ${offset}`
          ).single().expression
        )
      )
    );

    object.discriminant = Identifier(newVar);

    // possible so override
    object.cases.forEach((x, i) => {
      x.test = Literal(newStates[i]);
    });
  }
}
