import Transform from "./transform";
import {
  Node,
  FunctionDeclaration,
  ReturnStatement,
  CallExpression,
  Identifier,
  Literal,
  BinaryExpression,
  LogicalExpression,
  SwitchCase,
  SwitchStatement,
} from "../util/gen";
import { prepend } from "../util/insert";
import { getBlock } from "../traverse";
import { getRandomInteger } from "../util/random";
import { ObfuscateOrder } from "../order";
import { ok } from "assert";
import { OPERATOR_PRECEDENCE } from "../precedence";

export default class Calculator extends Transform {
  gen: any;
  ops: { [operator: string]: number };
  statesUsed: Set<string>;
  calculatorFn: string;

  constructor(o) {
    super(o, ObfuscateOrder.Calculator);

    this.ops = Object.create(null);
    this.statesUsed = new Set();
    this.calculatorFn = this.getPlaceholder();

    this.gen = this.getGenerator();
  }

  apply(tree) {
    super.apply(tree);

    if (Object.keys(this.ops).length == 0) {
      return;
    }

    var opArg = this.getPlaceholder();
    var leftArg = this.getPlaceholder();
    var rightArg = this.getPlaceholder();
    var switchCases = [];

    Object.keys(this.ops).forEach((operator) => {
      var code = this.ops[operator];

      var factory =
        operator == "&&" || operator == "||"
          ? LogicalExpression
          : BinaryExpression;

      var body = [
        ReturnStatement(
          factory(operator, Identifier(leftArg), Identifier(rightArg))
        ),
      ];

      switchCases.push(SwitchCase(Literal(code), body));
    });

    var func = FunctionDeclaration(
      this.calculatorFn,
      [opArg, leftArg, rightArg].map((x) => Identifier(x)),
      [SwitchStatement(Identifier(opArg), switchCases)]
    );

    prepend(tree, func);
  }

  match(object: Node, parents: Node[]) {
    return object.type == "BinaryExpression";
  }

  transform(object: Node, parents: Node[]) {
    var operator = object.operator;
    var allowedOperators = new Set(["+", "-", "*", "/"]);
    if (!allowedOperators.has(operator)) {
      return;
    }

    var myPrecedence =
      OPERATOR_PRECEDENCE[operator] +
      Object.keys(OPERATOR_PRECEDENCE).indexOf(operator) / 100;
    var precedences = parents.map(
      (x) =>
        x.type == "BinaryExpression" &&
        OPERATOR_PRECEDENCE[x.operator] +
          Object.keys(OPERATOR_PRECEDENCE).indexOf(x.operator) / 100
    );

    // corrupt AST
    if (precedences.find((x) => x >= myPrecedence)) {
      return;
    }
    if (
      parents.find((x) => x.$dispatcherSkip || x.type == "BinaryExpression")
    ) {
      return;
    }

    return () => {
      if (typeof this.ops[operator] !== "number") {
        var newState;
        do {
          newState = getRandomInteger(
            -1000,
            1000 + Object.keys(this.ops).length * 5
          );
        } while (this.statesUsed.has(newState));

        ok(!isNaN(newState));

        this.statesUsed.add(newState);
        this.ops[operator] = newState;
        this.log(operator, `calc(${newState}, left, right)`);
      }

      this.replace(
        object,
        CallExpression(Identifier(this.calculatorFn), [
          Literal(this.ops[operator]),
          object.left,
          object.right,
        ])
      );
    };
  }
}
