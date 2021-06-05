import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { ComputeProbabilityMap } from "../../probability";
import { isBlock } from "../../traverse";
import {
  AssignmentExpression,
  BinaryExpression,
  BreakStatement,
  ExpressionStatement,
  Identifier,
  Literal,
  Node,
  SwitchCase,
  SwitchStatement,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../../util/gen";
import { containsLexicallyBoundVariables } from "../../util/identifiers";
import { clone, getBlockBody } from "../../util/insert";
import { getRandomInteger, shuffle } from "../../util/random";
import Transform from "../transform";
import ControlFlowObfuscation from "./controlFlowObfuscation";
import SwitchCaseObfuscation from "./switchCaseObfucation";

/**
 * Breaks functions into DAGs (Directed Acyclic Graphs)
 *
 * - 1. Break functions into chunks
 * - 2. Shuffle chunks but remember their original position
 * - 3. Create a Switch statement inside a While loop, each case is a chunk, and the while loops exits on the last transition.
 *
 * The Switch statement:
 *
 * - 1. The state variable controls which case will run next
 * - 2. At the end of each case, the state variable is updated to the next block of code.
 * - 3. The while loop continues until the the state variable is the end state.
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
    return () => {
      if (containsLexicallyBoundVariables(object, parents)) {
        return;
      }

      if (
        !ComputeProbabilityMap(this.options.controlFlowFlattening, (x) => x)
      ) {
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
          fraction /= Math.max(1.2, body.length - 18);
        }
        fraction = Math.min(0.1, fraction);
        if (isNaN(fraction) || !isFinite(fraction)) {
          fraction = 0.5;
        }

        body.forEach((x, i) => {
          if (functionDeclarations.has(x)) {
            return;
          }

          var currentChunk = chunks[chunks.length - 1];

          if (!currentChunk.length || Math.random() < fraction) {
            currentChunk.push(x);
          } else {
            // Start new chunk
            chunks.push([x]);
          }
        });

        if (!chunks[chunks.length - 1].length) {
          chunks.pop();
        }
        if (chunks.length < 2) {
          return;
        }

        var selection: Set<number> = new Set();

        for (var i = 0; i < chunks.length + 1; i++) {
          var newState;
          do {
            newState = getRandomInteger(1, chunks.length * 10);
          } while (selection.has(newState));

          selection.add(newState);
        }

        ok(selection.size == chunks.length + 1);

        var states = Array.from(selection);
        var stateVar = this.getPlaceholder();

        var startState = states[0];
        var endState = states[states.length - 1];

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

        shuffle(cases);

        var discriminant = Identifier(stateVar);

        body.length = 0;

        if (functionDeclarations.size) {
          functionDeclarations.forEach((x) => {
            body.unshift(clone(x));
          });
        }

        var switchStatement: Node = SwitchStatement(
          discriminant,
          cases.map((x, i) => {
            var state = x.state;
            var nextState = x.nextState;
            var diff = nextState - state;

            ok(!isNaN(diff));

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
          VariableDeclaration(
            VariableDeclarator(stateVar, Literal(startState))
          ),

          WhileStatement(
            BinaryExpression("!=", Identifier(stateVar), Literal(endState)),
            [switchStatement]
          )
        );

        object.$controlFlowObfuscation = 1;
      }
    };
  }
}
