import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { ComputeProbabilityMap } from "../../probability";
import Template from "../../templates/template";
import { isBlock, walk } from "../../traverse";
import {
  AssignmentExpression,
  BinaryExpression,
  BreakStatement,
  ConditionalExpression,
  ExpressionStatement,
  Identifier,
  Literal,
  Node,
  SequenceExpression,
  SwitchCase,
  SwitchStatement,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../../util/gen";
import {
  containsLexicallyBoundVariables,
  getIdentifierInfo,
} from "../../util/identifiers";
import { clone, getBlockBody } from "../../util/insert";
import { choice, getRandomInteger, shuffle } from "../../util/random";
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
        var fnNames: Set<string> = new Set();

        body.forEach((stmt, i) => {
          if (stmt.type == "FunctionDeclaration") {
            functionDeclarations.add(stmt);
            fnNames.add(stmt.id && stmt.id.name);
          }
        });

        if (functionDeclarations.size) {
          walk(object, parents, (o, p) => {
            if (o.type == "Identifier") {
              var info = getIdentifierInfo(o, p);
              if (!info.spec.isReferenced) {
                return;
              }

              if (info.spec.isModified) {
                fnNames.delete(o.name);
              } else if (info.spec.isDefined) {
                if (info.isFunctionDeclaration) {
                  if (!functionDeclarations.has(p[0])) {
                    fnNames.delete(o.name);
                  }
                } else {
                  fnNames.delete(o.name);
                }
              }
            }
          });
        }

        // redefined function,
        if (functionDeclarations.size !== fnNames.size) {
          return;
        }

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

        var caseSelection: Set<number> = new Set();

        for (var i = 0; i < chunks.length + 1; i++) {
          var newState;
          do {
            newState = getRandomInteger(1, chunks.length * 15);
          } while (caseSelection.has(newState));

          caseSelection.add(newState);
        }

        ok(caseSelection.size == chunks.length + 1);

        var caseStates = Array.from(caseSelection);

        var startState = caseStates[0];
        var endState = caseStates[caseStates.length - 1];

        var stateVars = Array(getRandomInteger(2, 7))
          .fill(0)
          .map(() => this.getPlaceholder());
        var stateValues = Array(stateVars.length)
          .fill(0)
          .map(() => getRandomInteger(-250, 250));

        const getCurrentState = () => {
          return stateValues.reduce((a, b) => b + a, 0);
        };

        var correctIndex = getRandomInteger(0, stateVars.length);
        stateValues[correctIndex] =
          startState - (getCurrentState() - stateValues[correctIndex]);

        var initStateValues = [...stateValues];

        const numberLiteral = (num, depth) => {
          if (Math.random() > 0.9 / (depth * 4) || depth > 15) {
            return Literal(num);
          } else {
            var opposing = getRandomInteger(0, stateVars.length);

            if (Math.random() > 0.5) {
              var x = getRandomInteger(-250, 250);
              var operator = choice([">", "<"]);
              var answer =
                operator == ">"
                  ? x > stateValues[opposing]
                  : x < stateValues[opposing];
              var correct = numberLiteral(num, depth + 1);
              var incorrect = numberLiteral(
                getRandomInteger(-250, 250),
                depth + 1
              );

              return ConditionalExpression(
                BinaryExpression(
                  operator,
                  numberLiteral(x, depth + 1),
                  Identifier(stateVars[opposing])
                ),
                answer ? correct : incorrect,
                answer ? incorrect : correct
              );
            } else {
              return BinaryExpression(
                "-",
                Identifier(stateVars[opposing]),
                numberLiteral(stateValues[opposing] - num, depth + 1)
              );
            }
          }
        };

        const createTransitionStatement = (index, add) => {
          var newValue = stateValues[index] + add;

          var expr = null;

          if (Math.random() > 0.5) {
            expr = ExpressionStatement(
              AssignmentExpression(
                "+=",
                Identifier(stateVars[index]),
                numberLiteral(add, 0)
              )
            );
          } else {
            var double = stateValues[index] * 2;
            var diff = double - newValue;

            var first = AssignmentExpression(
              "*=",
              Identifier(stateVars[index]),
              numberLiteral(2, 0)
            );
            stateValues[index] = double;

            expr = ExpressionStatement(
              SequenceExpression([
                first,
                AssignmentExpression(
                  "-=",
                  Identifier(stateVars[index]),
                  numberLiteral(diff, 0)
                ),
              ])
            );
          }

          stateValues[index] = newValue;

          return expr;
        };

        interface Case {
          state: number;
          nextState: number;
          body: Node[];
          order: number;
          transitionStatements: Node[];
        }

        var order = Object.create(null);
        var cases: Case[] = chunks.map((body, i) => {
          var state = caseStates[i];
          var nextState = caseStates[i + 1];
          var diff = nextState - state;
          var transitionStatements = [];

          ok(!isNaN(diff));
          var modifying = getRandomInteger(0, stateVars.length);
          var shift = 0;

          // var c1 = Identifier("undefined");
          // this.addComment(c1, stateValues.join(", "));
          // transitionStatements.push(c1);

          transitionStatements.push(
            ...Array.from(
              new Set(
                Array(getRandomInteger(0, stateVars.length - 2))
                  .fill(0)
                  .map(() => getRandomInteger(0, stateVars.length))
                  .filter((x) => x != modifying)
              )
            ).map((x) => {
              var randomNumber = getRandomInteger(-250, 250);

              shift += randomNumber;
              return createTransitionStatement(x, randomNumber);
            })
          );
          transitionStatements.push(
            createTransitionStatement(modifying, diff - shift)
          );

          // var c = Identifier("undefined");
          // this.addComment(c, stateValues.join(", "));
          // transitionStatements.push(c);

          var caseObject = {
            body: body,
            state: state,
            nextState: nextState,
            order: i,
            transitionStatements: transitionStatements,
          };
          order[i] = caseObject;

          return caseObject;
        });

        shuffle(cases);

        var discriminant = Template(`${stateVars.join("+")}`).single()
          .expression;

        body.length = 0;

        if (functionDeclarations.size) {
          functionDeclarations.forEach((x) => {
            body.unshift(clone(x));
          });
        }

        var switchStatement: Node = SwitchStatement(
          discriminant,
          cases.map((x, i) => {
            var statements = [];

            statements.push(...x.body);

            statements.push(...x.transitionStatements);

            statements.push(BreakStatement());

            var test = Literal(x.state);

            return SwitchCase(test, statements);
          })
        );

        body.push(
          VariableDeclaration(
            stateVars.map((stateVar, i) => {
              return VariableDeclarator(stateVar, Literal(initStateValues[i]));
            })
          ),

          WhileStatement(
            BinaryExpression("!=", clone(discriminant), Literal(endState)),
            [switchStatement]
          )
        );
      }
    };
  }
}
