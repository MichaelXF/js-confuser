import Transform from "./transform";
import {
  Node,
  FunctionDeclaration,
  ReturnStatement,
  CallExpression,
  Identifier,
  Literal,
  BinaryExpression,
  SwitchCase,
  SwitchStatement,
  AssignmentExpression,
  VariableDeclaration,
  VariableDeclarator,
  UnaryExpression,
} from "../util/gen";
import { prepend } from "../util/insert";
import { choice, getRandomInteger } from "../util/random";
import { ObfuscateOrder } from "../order";
import { ok } from "assert";
import { OPERATOR_PRECEDENCE } from "../precedence";
import Template from "../templates/template";
import { ComputeProbabilityMap } from "../probability";

const allowedBinaryOperators = new Set(["+", "-", "*", "/"]);
const allowedUnaryOperators = new Set(["!", "void", "typeof", "-", "~", "+"]);

export default class Calculator extends Transform {
  gen: ReturnType<Transform["getGenerator"]>;
  ops: { [operator: string]: number };
  statesUsed: Set<string>;
  calculatorFn: string;
  calculatorOpVar: string;
  calculatorSetOpFn: string;

  constructor(o) {
    super(o, ObfuscateOrder.Calculator);

    this.ops = Object.create(null);
    this.statesUsed = new Set();
    this.calculatorFn = this.getPlaceholder() + "_calc";
    this.calculatorOpVar = this.getPlaceholder();
    this.calculatorSetOpFn = this.getPlaceholder();

    this.gen = this.getGenerator();
  }

  apply(tree) {
    super.apply(tree);

    if (Object.keys(this.ops).length == 0) {
      return;
    }

    var leftArg = this.getPlaceholder();
    var rightArg = this.getPlaceholder();
    var switchCases = [];

    Object.keys(this.ops).forEach((opKey) => {
      var [type, operator] = opKey.split("_");

      var code = this.ops[opKey];
      var body = [];

      if (type === "Binary") {
        body = [
          ReturnStatement(
            BinaryExpression(
              operator,
              Identifier(leftArg),
              Identifier(rightArg)
            )
          ),
        ];
      } else if (type === "Unary") {
        body = [
          ReturnStatement(UnaryExpression(operator, Identifier(leftArg))),
        ];
      } else {
        throw new Error("Unknown type: " + type);
      }

      switchCases.push(SwitchCase(Literal(code), body));
    });

    var func = FunctionDeclaration(
      this.calculatorFn,
      [leftArg, rightArg].map((x) => Identifier(x)),
      [SwitchStatement(Identifier(this.calculatorOpVar), switchCases)]
    );

    prepend(
      tree,
      VariableDeclaration(VariableDeclarator(this.calculatorOpVar))
    );

    prepend(
      tree,
      new Template(`function {name}(a){
        a = {b} + ({b}=a, 0);
        return a;
      }`).single({ name: this.calculatorSetOpFn, b: this.calculatorOpVar })
    );

    prepend(tree, func);
  }

  match(object: Node, parents: Node[]) {
    return (
      object.type === "BinaryExpression" || object.type === "UnaryExpression"
    );
  }

  transform(object: Node, parents: Node[]) {
    // Allow percentage
    if (!ComputeProbabilityMap(this.options.calculator)) {
      return;
    }

    var operator = object.operator;

    var type;

    if (object.type === "BinaryExpression") {
      type = "Binary";

      if (!allowedBinaryOperators.has(operator)) {
        return;
      }

      // Additional checks to ensure complex expressions still work
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
        parents.find(
          (x) => x.$multiTransformSkip || x.type == "BinaryExpression"
        )
      ) {
        return;
      }
    }

    if (object.type === "UnaryExpression") {
      type = "Unary";

      if (!allowedUnaryOperators.has(operator)) {
        return;
      }

      // Typeof expression fix
      if (operator === "typeof" && object.argument.type === "Identifier") {
        // `typeof name` is special because it can reference the variable `name` without
        // throwing any errors. If changed, an error could be thrown, breaking the users code
        return;
      }
    }

    return () => {
      const opKey = type + "_" + operator;

      if (typeof this.ops[opKey] !== "number") {
        var newState;
        do {
          newState = getRandomInteger(
            -50,
            50 + Object.keys(this.ops).length * 5
          );
        } while (this.statesUsed.has(newState));

        ok(!isNaN(newState));

        this.statesUsed.add(newState);
        this.ops[opKey] = newState;

        if (type === "Binary") {
          this.log(
            `left ${operator} right ->`,
            `${this.calculatorFn}((${newState}, left, right)`
          );
        } else if (type === "Unary") {
          this.log(
            `${operator}(argument) ->`,
            `${this.calculatorFn}(${newState}, argument)`
          );
        }
      }

      // The operator expression sets the operator to be used
      var operatorExpression = choice([
        AssignmentExpression(
          "=",
          Identifier(this.calculatorOpVar),
          Literal(this.ops[opKey])
        ),
        CallExpression(Identifier(this.calculatorSetOpFn), [
          Literal(this.ops[opKey]),
        ]),
      ]);

      var newExpression;
      if (type === "Binary") {
        newExpression = CallExpression(Identifier(this.calculatorFn), [
          object.left,
          object.right,
          operatorExpression,
        ]);
      } else {
        newExpression = CallExpression(Identifier(this.calculatorFn), [
          object.argument,
          operatorExpression,
        ]);
      }

      this.replace(object, newExpression);
    };
  }
}
