import { ok } from "assert";
import { ComputeProbabilityMap } from "../index";
import { ObfuscateOrder } from "../obfuscator";
import Template from "../templates/template";
import { isBlock, walk } from "../traverse";
import {
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  ExpressionStatement,
  Identifier,
  IfStatement,
  LabeledStatement,
  Literal,
  LogicalExpression,
  Node,
  ObjectExpression,
  Property,
  ReturnStatement,
  SwitchCase,
  SwitchStatement,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../util/gen";
import { getBlockBody, prepend } from "../util/insert";
import { choice, getRandomInteger, shuffle } from "../util/random";
import { getFactors } from "../util/compare";
import Transform from "./transform";

/**
 * Does complex math to the state variable, after both CFF and CFO have run.
 *
 * The switch statements are ones with numbered cases and a single identifier discriminant.
 */
export class SwitchCaseObfuscation extends Transform {
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

    if (parents[0].type == "LabelStatement") {
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

/**
 * Obfuscates For and While statements.
 */
export class ControlFlowObfuscation extends Transform {
  constructor(o) {
    super(o);
  }

  match(object, parents) {
    return {
      ForStatement: 1,
    }[object.type];
  }

  transform(object, parents) {
    if (object.$controlFlowObfuscation) {
      // avoid infinite loop
      return;
    }

    if (containsLexicallyBoundVariables(object)) {
      return;
    }

    // No place to insert more statements
    if (!Array.isArray(parents[0])) {
      return;
    }

    if (!ComputeProbabilityMap(this.options.controlFlowFlattening)) {
      return;
    }

    var init = [];
    var update = [];
    var test: Node = null;
    var consequent = [];

    if (object.type == "ForStatement") {
      if (object.init) {
        init.push({ ...object.init });
      }
      if (object.update) {
        update.push(ExpressionStatement({ ...object.update }));
      }
      if (object.test) {
        test = object.test;
      }
    }

    if (object.type == "WhileStatement") {
      if (object.test) {
        test = object.test;
      }
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

    var stateVar = this.getPlaceholder();

    //            init 0  test 1  run 2  update 3  end 4
    var states: number[] = [];

    // Create 4 random unique number
    while (states.length <= 4) {
      var newState;
      do {
        newState = getRandomInteger(0, 1000 + states.length);
      } while (states.indexOf(newState) != -1);

      states.push(newState);
    }

    getBlockBody(parents[1] || parents[0]).unshift(
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
          { ...test },
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

    Array(getRandomInteger(0, 3))
      .fill(0)
      .map(() => {
        var newState;
        do {
          newState = getRandomInteger(0, 1000 + states.length * 2);
        } while (states.indexOf(newState) != -1);
        states.push(newState);

        var nextState;
        do {
          nextState = getRandomInteger(0, 1000 + states.length * 3);
        } while (states.indexOf(nextState) != -1);
        states.push(nextState);

        var body = [];

        body.push(
          ExpressionStatement(
            AssignmentExpression("=", Identifier(stateVar), Literal(nextState))
          ),
          BreakStatement()
        );

        cases.push(SwitchCase(Literal(newState), body));
      });

    shuffle(cases);

    this.replace(
      object,
      WhileStatement(
        BinaryExpression(
          "!=",
          Identifier(stateVar),
          Literal(states[states.length - 1])
        ),
        [SwitchStatement(Identifier(stateVar), cases)]
      )
    );

    // Marked to not be infinite
    object.$controlFlowObfuscation = 1;
  }
}

function containsLexicallyBoundVariables(object: Node) {
  var contains = false;
  walk(object, [], (o, p) => {
    if (o.type == "VariableDeclaration") {
      if (o.kind === "let") {
        // Control Flow Flattening changes the lexical block, therefore this is not possible
        // Maybe a transformation to remove let
        contains = true;
      }
    }
  });

  return contains;
}

/**
 * Breaks functions into DAGs (Directed Acyclic Graphs)
 *
 * - 1. Break functions into chunks
 * - 2. Shuffle order and assign a random number to each index
 * - 3. Create a Switch Case for each, with transition to next block.
 *
 * The Switch statement:
 *
 * - 1. The state variable controls which case will run next
 * - 2. At the end of each case, the state variable is updated to the next block of code.
 * - 3. The while loop continues until the the state variable is the end state.
 *
 */
export default class ControlFlowFlattening extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.ControlFlowFlattening);

    this.before.push(new ControlFlowObfuscation(o));

    this.after.push(new SwitchCaseObfuscation(o));
  }

  match(object, parents) {
    return isBlock(object);
  }

  transform(object, parents) {
    if (containsLexicallyBoundVariables(object)) {
      return;
    }

    if (!ComputeProbabilityMap(this.options.controlFlowFlattening)) {
      return;
    }

    var body = getBlockBody(object.body);
    if (body.length) {
      // First step is to reorder the body
      // Fix 1. Bring hoisted functions up to be declared first

      var functionDeclarations: Set<Node> = new Set();

      body.forEach((stmt, i) => {
        if (stmt.type == "FunctionDeclaration") {
          functionDeclarations.add(stmt);
        }
      });

      var chunks: Node[][] = [[]];

      var fraction = 0.9;
      if (body.length > 20) {
        fraction /= body.length - 18;
      }
      fraction = Math.min(0.1, fraction);

      body.forEach((x, i) => {
        if (functionDeclarations.has(x)) {
          return;
        }

        var current = chunks[chunks.length - 1];

        if (!current.length || Math.random() < fraction) {
          current.push(x);
        } else {
          chunks.push([x]);
        }
      });

      if (!chunks[chunks.length - 1].length) {
        chunks.pop();
      }
      if (chunks.length < 2) {
        return;
      }

      // Add empty cases serving as transitions
      Array(getRandomInteger(0, 3))
        .fill(0)
        .map((x) => {
          var index = getRandomInteger(0, chunks.length);

          // Empty chunk = no code
          chunks.splice(index, 0, []);
        });

      var selection: Set<number> = new Set();

      var deadCases = getRandomInteger(0, 3);

      for (var i = 0; i < chunks.length + 1 + deadCases; i++) {
        var newState;
        do {
          newState = getRandomInteger(1, chunks.length * 5);
        } while (selection.has(newState));

        selection.add(newState);
      }

      ok(selection.size == chunks.length + 1 + deadCases);

      var states = Array.from(selection);
      var stateVar = this.getPlaceholder();

      var endState = states[states.length - 1 - deadCases];

      interface Case {
        state: number;
        nextState: number;
        body: Node[];
        order: number;
      }

      var order = Object.create(null);
      var cases: Case[] = chunks.map((body, i) => {
        var caseObject = {
          body: body,
          state: states[i],
          nextState: states[i + 1],
          order: i,
        };
        order[i] = caseObject;

        return caseObject;
      });

      // Add dead cases that can never be reached
      Array(deadCases)
        .fill(0)
        .forEach((x, i) => {
          var thisState = states[chunks.length + i];
          var nextState;

          do {
            nextState = choice(states);
          } while (nextState == thisState);

          cases.push({
            body: [],
            state: thisState,
            nextState: nextState,
            order: -i,
          });
        });

      shuffle(cases);

      var discriminant = Identifier(stateVar);

      return () => {
        body.length = 0;

        if (functionDeclarations.size) {
          functionDeclarations.forEach((x) => {
            body.unshift({ ...x });
          });
        }

        var switchStatement: Node = SwitchStatement(
          discriminant,
          cases.map((x, i) => {
            var state = x.state;
            var nextState = x.nextState;
            var diff = nextState - state;

            var statements = [];

            statements.push(...x.body);
            statements.push(
              ExpressionStatement(
                AssignmentExpression("+=", Identifier(stateVar), Literal(diff))
              )
            );

            statements.push(BreakStatement());

            var test = Literal(state);

            return SwitchCase(test, statements);
          })
        );

        body.push(
          VariableDeclaration(VariableDeclarator(stateVar, Literal(states[0]))),

          WhileStatement(
            BinaryExpression("!=", Identifier(stateVar), Literal(endState)),
            [switchStatement]
          )
        );
      };
    }
  }
}
