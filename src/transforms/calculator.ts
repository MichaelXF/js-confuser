import Transform from "./transform";
import {
  Node,
  FunctionDeclaration,
  ReturnStatement,
  CallExpression,
  Identifier,
  Literal,
  IfStatement,
  BinaryExpression,
  LogicalExpression,
  SwitchCase,
  SwitchStatement,
  ThrowStatement,
} from "../util/gen";
import { prepend } from "../util/insert";
import { ObfuscateOrder } from "../obfuscator";
import { getBlock } from "../traverse";
import { getRandomInteger } from "../util/random";

export default class Calculator extends Transform {
  gen: any;
  ops: { [operator: string]: string };
  calculatorFn: string;

  constructor(o) {
    super(o, ObfuscateOrder.Calculator);

    this.ops = Object.create(null);
    this.calculatorFn = this.getPlaceholder();

    this.gen = this.getGenerator();
  }

  match(object: Node, parents: Node[]) {
    return object.type == "Program" || object.type == "BinaryExpression";
  }

  transform(object: Node, parents: Node[]) {
    if (object.type == "Program") {
      return () => {
        var block = getBlock(object, parents);

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

        prepend(block, func);
      };
    }

    if (object.type == "BinaryExpression") {
      var operator = object.operator;
      if (
        !operator ||
        operator == "==" ||
        operator == "!=" ||
        operator == "==="
      ) {
        return;
      }
      if (!this.ops[operator]) {
        var newState;
        do {
          newState = getRandomInteger(
            -1000,
            1000 + Object.keys(this.ops).length * 5
          );
        } while (Object.values(this.ops).indexOf(newState) != -1);

        this.ops[operator] = newState;
        this.log(operator, `calc(${newState}, left, right)`);
      }

      return () => {
        this.replace(
          object,
          CallExpression(Identifier(this.calculatorFn), [
            Literal(this.ops[operator]),
            { ...object.left },
            { ...object.right },
          ])
        );
      };
    }
  }
}
