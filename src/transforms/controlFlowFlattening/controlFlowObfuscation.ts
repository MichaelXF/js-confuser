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
import { containsLexicallyBoundVariables } from "../../util/identifiers";
import { clone, getBlockBody, prepend } from "../../util/insert";
import {
  choice,
  getRandomInteger,
  getRandomTrueExpression,
  shuffle,
} from "../../util/random";
import Transform from "../transform";

/**
 * Obfuscates For and While statements.
 */
export default class ControlFlowObfuscation extends Transform {
  constructor(o) {
    super(o);
  }

  match(object: Node, parents: Node[]) {
    return object.type === "ForStatement" || object.type === "WhileStatement";
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (object.$controlFlowObfuscation) {
        // avoid infinite loop
        return;
      }

      if (containsLexicallyBoundVariables(object, parents)) {
        return;
      }

      var body =
        parents[0].type == "LabeledStatement" ? parents[1] : parents[0];

      // No place to insert more statements
      if (!Array.isArray(body)) {
        return;
      }

      if (
        !ComputeProbabilityMap(this.options.controlFlowFlattening, (x) => x)
      ) {
        return;
      }

      var init = [];
      var update = [];
      var test: Node = null;
      var consequent = [];

      if (object.type === "ForStatement") {
        if (object.init) {
          init.push({ ...object.init });
        }
        if (object.update) {
          update.push(ExpressionStatement(clone(object.update)));
        }
        if (object.test) {
          test = object.test || Literal(true);
        }
      } else if (object.type === "WhileStatement") {
        if (object.test) {
          test = object.test || Literal(true);
        }
      } else {
        throw new Error("Unknown type: " + object.type);
      }

      if (object.body.type == "BlockStatement") {
        consequent.push(...getBlockBody(object.body));
      } else {
        consequent.push(object.body);
      }

      if (!test) {
        test = Literal(true);
      }

      ok(test);

      init.forEach((o) => {
        if (
          o.type !== "VariableDeclaration" &&
          o.type !== "ExpressionStatement"
        ) {
          this.replace(o, ExpressionStatement(clone(o)));
        }
      });

      var stateVar = this.getPlaceholder();

      //            init 0  test 1  run 2  update 3  end 4
      var states: number[] = [];

      // Create 5 random unique number
      while (states.length < 5) {
        var newState;
        do {
          newState = getRandomInteger(0, 1000 + states.length);
        } while (states.indexOf(newState) !== -1);

        ok(!isNaN(newState));

        states.push(newState);
      }
      ok(new Set(states).size === states.length);

      body.unshift(
        VariableDeclaration(VariableDeclarator(stateVar, Literal(states[0])))
      );

      function goto(from: number, to: number) {
        return ExpressionStatement(
          AssignmentExpression("+=", Identifier(stateVar), Literal(to - from))
        );
      }

      var cases = [
        SwitchCase(Literal(states[0]), [
          ...init,
          goto(states[0], states[1]),
          BreakStatement(),
        ]),
        SwitchCase(Literal(states[1]), [
          IfStatement(
            clone(test),
            [goto(states[1], states[2])],
            [goto(states[1], states[4])]
          ),
          BreakStatement(),
        ]),
        SwitchCase(Literal(states[2]), [
          ...consequent,
          goto(states[2], states[3]),
          BreakStatement(),
        ]),
        SwitchCase(Literal(states[3]), [
          ...update,
          goto(states[3], states[1]),
          BreakStatement(),
        ]),
      ];

      var endState = states[states.length - 1];

      Array(getRandomInteger(0, 3))
        .fill(0)
        .map(() => {
          var newState;
          do {
            newState = getRandomInteger(0, 1000 + states.length * 2);
          } while (states.indexOf(newState) !== -1);
          states.push(newState);

          var nextState;
          do {
            nextState = getRandomInteger(0, 1000 + states.length * 3);
          } while (states.indexOf(nextState) !== -1 || newState === nextState);
          states.push(nextState);

          ok(new Set(states).size === states.length);

          var caseBody = [goto(newState, newState), BreakStatement()];

          cases.push(SwitchCase(Literal(newState), caseBody));
        });

      shuffle(cases);

      this.replace(
        object,
        WhileStatement(
          BinaryExpression("!=", Identifier(stateVar), Literal(endState)),
          [SwitchStatement(Identifier(stateVar), cases)]
        )
      );

      // Marked to not be infinite
      object.$controlFlowObfuscation = 1;
    };
  }
}
