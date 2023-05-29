import { ok } from "assert";
import { compileJsSync } from "../../compiler";
import { ObfuscateOrder } from "../../order";
import { ComputeProbabilityMap } from "../../probability";
import Template from "../../templates/template";
import { getBlock, isBlock, walk } from "../../traverse";
import {
  ArrayExpression,
  ArrayPattern,
  AssignmentExpression,
  BinaryExpression,
  BreakStatement,
  CallExpression,
  ConditionalExpression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  IfStatement,
  LabeledStatement,
  Literal,
  Location,
  MemberExpression,
  Node,
  ObjectExpression,
  Property,
  ReturnStatement,
  SequenceExpression,
  SwitchCase,
  SwitchStatement,
  UnaryExpression,
  VariableDeclaration,
  VariableDeclarator,
  WhileStatement,
} from "../../util/gen";
import {
  containsLexicallyBoundVariables,
  getIdentifierInfo,
} from "../../util/identifiers";
import {
  clone,
  getBlockBody,
  getFunction,
  isContext,
  isForInitialize,
  isVarContext,
} from "../../util/insert";
import { chance, choice, getRandomInteger, shuffle } from "../../util/random";
import Transform from "../transform";
import ControlFlowObfuscation from "./controlFlowObfuscation";
import ExpressionObfuscation from "./expressionObfuscation";
import SwitchCaseObfuscation from "./switchCaseObfuscation";
import { isModuleSource } from "../string/stringConcealing";
import { reservedIdentifiers } from "../../constants";

var flattenStructures = new Set([
  "IfStatement",
  "ForStatement",
  "WhileStatement",
  "DoWhileStatement",
]);

/**
 * A chunk represents a small segment of code
 */
interface Chunk {
  label: string;
  body: Node[];

  impossible?: boolean;
}

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
  // in Debug mode, the output is much easier to read
  isDebug = false;
  mangleNumberLiterals = true;
  mangleBooleanLiterals = true;
  mangleIdentifiers = true;
  outlineStatements = true;
  outlineExpressions = true;

  // Limit amount of mangling
  mangledExpressionsMade = 0;

  // Previously used switch labels
  switchLabels = new Set<string>();

  constructor(o) {
    super(o, ObfuscateOrder.ControlFlowFlattening);

    if (!this.isDebug) {
      this.before.push(new ExpressionObfuscation(o));

      this.after.push(new ControlFlowObfuscation(o));
      this.after.push(new SwitchCaseObfuscation(o));
    } else {
      console.warn("Debug mode enabled");
    }

    // this.after.push(new ChoiceFlowObfuscation(o));
  }

  match(object, parents) {
    return (
      isBlock(object) &&
      (!parents[1] || !flattenStructures.has(parents[1].type)) &&
      (!parents[2] || !flattenStructures.has(parents[2].type))
    );
  }

  transform(object, parents) {
    return () => {
      if (object.body.length < 3) {
        return;
      }
      if (containsLexicallyBoundVariables(object, parents)) {
        return;
      }

      if (
        !ComputeProbabilityMap(this.options.controlFlowFlattening, (x) => x)
      ) {
        return;
      }

      var body = getBlockBody(object.body);
      if (!body.length) {
        return;
      }
      // First step is to reorder the body
      // Fix 1. Bring hoisted functions up to be declared first

      var functionDeclarations: Set<Node> = new Set();
      var fnNames: Set<string> = new Set();
      var illegalFnNames = new Set<string>();

      /**
       * The variable names
       *
       * index -> var name
       */
      var stateVars = Array(this.isDebug ? 1 : getRandomInteger(2, 5))
        .fill(0)
        .map(() => this.getPlaceholder());

      body.forEach((stmt, i) => {
        if (stmt.type == "FunctionDeclaration") {
          functionDeclarations.add(stmt);
          var name = stmt.id && stmt.id.name;
          fnNames.add(name);
          if (stmt.body.type !== "BlockStatement") {
            illegalFnNames.add(name);
          } else {
            walk(stmt, [body, object, ...parents], (o, p) => {
              if (
                o.type == "ThisExpression" ||
                o.type == "SuperExpression" ||
                (o.type == "Identifier" &&
                  (o.name == "arguments" || o.name == "eval"))
              ) {
                illegalFnNames.add(name);
                return "EXIT";
              }
            });
          }
        }
      });

      walk(object, parents, (o, p) => {
        if (o.type == "Identifier" && fnNames.has(o.name)) {
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

          if (!info.spec.isDefined) {
            var b = getBlock(o, p);
            if (b !== object || !p[0] || p[0].type !== "CallExpression") {
              illegalFnNames.add(o.name);
            } else {
              var isExtractable = false;
              if (p[1]) {
                if (
                  p[1].type == "ExpressionStatement" &&
                  p[1].expression == p[0] &&
                  p[2] == object.body
                ) {
                  isExtractable = true;
                  p[1].$callExpression = "ExpressionStatement";
                  p[1].$fnName = o.name;
                } else if (
                  p[1].type == "VariableDeclarator" &&
                  p[1].init == p[0] &&
                  p[2].length === 1 &&
                  p[4] == object.body
                ) {
                  isExtractable = true;
                  p[3].$callExpression = "VariableDeclarator";
                  p[3].$fnName = o.name;
                } else if (
                  p[1].type == "AssignmentExpression" &&
                  p[1].operator == "=" &&
                  p[1].right === p[0] &&
                  p[2] &&
                  p[2].type == "ExpressionStatement" &&
                  p[3] == object.body
                ) {
                  isExtractable = true;
                  p[2].$callExpression = "AssignmentExpression";
                  p[2].$fnName = o.name;
                }
              }

              if (!isExtractable) {
                illegalFnNames.add(o.name);
              }
            }
          }
        }
      });

      // redefined function,
      if (functionDeclarations.size !== fnNames.size) {
        return;
      }

      illegalFnNames.forEach((illegal) => {
        fnNames.delete(illegal);
      });

      var importDeclarations = [];
      for (var stmt of body) {
        if (stmt.type === "ImportDeclaration") {
          importDeclarations.push(stmt);
        }
      }

      var fraction = 0.9;
      if (body.length > 20) {
        fraction /= Math.max(1.2, body.length - 18);
      }
      fraction = Math.min(0.1, fraction);
      if (isNaN(fraction) || !isFinite(fraction)) {
        fraction = 0.5;
      }

      var resultVar = this.getPlaceholder();
      var argVar = this.getPlaceholder();
      var testVar = this.getPlaceholder();

      // The controlVar is an object containing:
      // - Strings found in chunks
      // - Numbers found in chunks
      // - Helper functions to adjust the state
      // - Outlined expressions changed into functions
      var controlVar = this.getPlaceholder();
      var controlPropertiesByLabel: { [label: string]: Node[] } = {};
      var controlMap = new Map<
        string | number,
        { key: string; label: string }
      >();
      var controlDynamicKeys = new Set<string>();
      var controlGen = this.getGenerator();

      // Helper function to easily make control object accessors
      const getControlMember = (key) =>
        MemberExpression(Identifier(controlVar), Literal(key), true);

      var needsTestVar = false;
      var needsResultAndArgVar = false;
      var fnToLabel: { [fnName: string]: string } = Object.create(null);

      fnNames.forEach((fnName) => {
        fnToLabel[fnName] = this.getPlaceholder();
      });

      const flattenBody = (
        body: Node[],
        startingLabel = this.getPlaceholder()
      ): Chunk[] => {
        var chunks: Chunk[] = [];
        var currentBody = [];
        var currentLabel = startingLabel;
        const finishCurrentChunk = (
          pointingLabel?: string,
          newLabel?: string,
          addGotoStatement = true
        ) => {
          if (!newLabel) {
            newLabel = this.getPlaceholder();
          }
          if (!pointingLabel) {
            pointingLabel = newLabel;
          }

          if (addGotoStatement) {
            currentBody.push({ type: "GotoStatement", label: pointingLabel });
          }

          chunks.push({
            label: currentLabel,
            body: [...currentBody],
          });

          walk(currentBody, [], (o, p) => {
            if (o.type === "Literal" && !this.isDebug) {
              // Add strings to the control object
              if (
                typeof o.value === "string" &&
                !isModuleSource(o, p) &&
                !o.regex &&
                chance(75 - controlMap.size)
              ) {
                if (!controlPropertiesByLabel[currentLabel]) {
                  controlPropertiesByLabel[currentLabel] = [];
                }

                var key = controlMap.get(o.value)?.key;

                // Not in the bank, add
                if (!key) {
                  key = controlGen.generate();

                  controlPropertiesByLabel[currentLabel].push(
                    Property(Literal(key), Literal(o.value), false)
                  );
                  controlMap.set(o.value, { key, label: currentLabel });
                }

                return () => {
                  this.replaceIdentifierOrLiteral(o, getControlMember(key), p);
                };
              }

              // Add numbers to the control object
              if (
                typeof o.value === "number" &&
                Math.floor(o.value) === o.value &&
                Math.abs(o.value) < 100_000 &&
                chance(50 - controlMap.size)
              ) {
                if (!controlPropertiesByLabel[currentLabel]) {
                  controlPropertiesByLabel[currentLabel] = [];
                }

                var key = controlMap.get(o.value)?.key;

                // Not in the bank, add
                if (!key) {
                  key = controlGen.generate();

                  controlPropertiesByLabel[currentLabel].push(
                    Property(Literal(key), Literal(o.value), false)
                  );
                  controlMap.set(o.value, { key, label: currentLabel });
                }

                return () => {
                  this.replaceIdentifierOrLiteral(o, getControlMember(key), p);
                };
              }
            }
          });

          currentLabel = newLabel;
          currentBody = [];
        };

        body.forEach((stmt, i) => {
          if (
            functionDeclarations.has(stmt) ||
            stmt.type === "ImportDeclaration"
          ) {
            return;
          }

          if (stmt.$exit) {
            currentBody.push(stmt);
            currentBody.push(BreakStatement(switchLabel));
            finishCurrentChunk(null, null, false);
            return;
          }

          if (stmt.$callExpression && fnToLabel[stmt.$fnName]) {
            var afterPath = this.getPlaceholder();
            var args = [];

            switch (stmt.$callExpression) {
              // var a = fn();
              case "VariableDeclarator":
                args = stmt.declarations[0].init.arguments;
                stmt.declarations[0].init = Identifier(resultVar);
                break;

              // fn();
              case "ExpressionStatement":
                args = stmt.expression.arguments;
                stmt.expression = Identifier("undefined");
                break;

              // a = fn();
              case "AssignmentExpression":
                args = stmt.expression.right.arguments;
                stmt.expression.right = Identifier(resultVar);
                break;
            }

            needsResultAndArgVar = true;

            currentBody.push(
              ExpressionStatement(
                AssignmentExpression(
                  "=",
                  Identifier(argVar),
                  ArrayExpression([
                    {
                      type: "StateIdentifier",
                      label: afterPath,
                    },
                    ArrayExpression(args),
                  ])
                )
              )
            );
            finishCurrentChunk(fnToLabel[stmt.$fnName], afterPath);
          }

          if (stmt.type == "GotoStatement" && i !== body.length - 1) {
            finishCurrentChunk(stmt.label);
            return;
          }

          if (stmt.type == "LabeledStatement") {
            var lbl = stmt.label.name;
            var control: Node = stmt.body;

            var isSwitchStatement = control.type === "SwitchStatement";

            if (
              isSwitchStatement ||
              ((control.type == "ForStatement" ||
                control.type == "WhileStatement" ||
                control.type == "DoWhileStatement") &&
                control.body.type == "BlockStatement")
            ) {
              if (isSwitchStatement) {
                if (
                  control.cases.length == 0 || // at least 1 case
                  control.cases.find(
                    (x) =>
                      !x.test || // cant be default case
                      !x.consequent.length || // must have body
                      x.consequent.findIndex(
                        (node) => node.type == "BreakStatement"
                      ) !==
                        x.consequent.length - 1 || // break statement must be at the end
                      x.consequent[x.consequent.length - 1].type !== // must end with break statement
                        "BreakStatement" ||
                      !x.consequent[x.consequent.length - 1].label || // must be labeled and correct
                      x.consequent[x.consequent.length - 1].label.name != lbl
                  )
                ) {
                  currentBody.push(stmt);
                  return;
                }
              }

              var isLoop = !isSwitchStatement;
              var supportContinueStatement = isLoop;

              var testPath = this.getPlaceholder();
              var updatePath = this.getPlaceholder();
              var bodyPath = this.getPlaceholder();
              var afterPath = this.getPlaceholder();
              var possible = true;
              var toReplace = [];

              walk(control.body, [], (o, p) => {
                if (
                  o.type == "BreakStatement" ||
                  (supportContinueStatement && o.type == "ContinueStatement")
                ) {
                  // TODO:
                  // Figure out a proper way to detect break's and continue's that are
                  // eligible for being flattened
                  if (!o.label || o.label.name !== lbl) {
                    if (!this.switchLabels.has(o.label.name)) {
                      possible = false;
                      return "EXIT";
                    }
                  }
                  if (o.label.name === lbl) {
                    return () => {
                      toReplace.push([
                        o,
                        {
                          type: "GotoStatement",
                          label:
                            o.type == "BreakStatement" ? afterPath : updatePath,
                        },
                      ]);
                    };
                  }
                }
              });
              if (!possible) {
                currentBody.push(stmt);
                return;
              }
              toReplace.forEach((v) => this.replace(v[0], v[1]));

              if (isSwitchStatement) {
                var switchVarName = this.getPlaceholder();

                currentBody.push(
                  VariableDeclaration(
                    VariableDeclarator(switchVarName, control.discriminant)
                  )
                );

                var afterPath = this.getPlaceholder();
                finishCurrentChunk();
                control.cases.forEach((switchCase, i) => {
                  var entryPath = this.getPlaceholder();

                  currentBody.push(
                    IfStatement(
                      BinaryExpression(
                        "===",
                        Identifier(switchVarName),
                        switchCase.test
                      ),
                      [
                        {
                          type: "GotoStatement",
                          label: entryPath,
                        },
                      ]
                    )
                  );

                  chunks.push(
                    ...flattenBody(
                      [
                        ...switchCase.consequent.slice(
                          0,
                          switchCase.consequent.length - 1
                        ),
                        {
                          type: "GotoStatement",
                          label: afterPath,
                        },
                      ],
                      entryPath
                    )
                  );

                  if (i === control.cases.length - 1) {
                  } else {
                    finishCurrentChunk();
                  }
                });

                finishCurrentChunk(afterPath, afterPath);
                return;
              } else if (isLoop) {
                var isPostTest = control.type == "DoWhileStatement";

                // add initializing section to current chunk
                if (control.init) {
                  if (control.init.type == "VariableDeclaration") {
                    currentBody.push(control.init);
                  } else {
                    currentBody.push(ExpressionStatement(control.init));
                  }
                }

                // create new label called `testPath` and have current chunk point to it (goto testPath)
                finishCurrentChunk(isPostTest ? bodyPath : testPath, testPath);

                currentBody.push(
                  ExpressionStatement(
                    AssignmentExpression(
                      "=",
                      Identifier(testVar),
                      control.test || Literal(true)
                    )
                  )
                );

                needsTestVar = true;

                finishCurrentChunk();

                currentBody.push(
                  IfStatement(Identifier(testVar), [
                    {
                      type: "GotoStatement",
                      label: bodyPath,
                    },
                  ])
                );

                // create new label called `bodyPath` and have test body point to afterPath (goto afterPath)
                finishCurrentChunk(afterPath, bodyPath);

                var innerBothPath = this.getPlaceholder();
                chunks.push(
                  ...flattenBody(
                    [
                      ...control.body.body,
                      {
                        type: "GotoStatement",
                        label: updatePath,
                      },
                    ],
                    innerBothPath
                  )
                );

                finishCurrentChunk(innerBothPath, updatePath);

                if (control.update) {
                  currentBody.push(ExpressionStatement(control.update));
                }

                finishCurrentChunk(testPath, afterPath);
                return;
              }
            }
          }

          if (
            stmt.type == "IfStatement" &&
            stmt.consequent.type == "BlockStatement" &&
            (!stmt.alternate || stmt.alternate.type == "BlockStatement")
          ) {
            finishCurrentChunk();

            currentBody.push(
              ExpressionStatement(
                AssignmentExpression("=", Identifier(testVar), stmt.test)
              )
            );

            needsTestVar = true;

            finishCurrentChunk();

            var hasAlternate = !!stmt.alternate;
            ok(!(hasAlternate && stmt.alternate.type !== "BlockStatement"));

            var yesPath = this.getPlaceholder();
            var noPath = this.getPlaceholder();
            var afterPath = this.getPlaceholder();

            currentBody.push(
              IfStatement(Identifier(testVar), [
                {
                  type: "GotoStatement",
                  label: yesPath,
                },
              ])
            );

            chunks.push(
              ...flattenBody(
                [
                  ...stmt.consequent.body,
                  {
                    type: "GotoStatement",
                    label: afterPath,
                  },
                ],
                yesPath
              )
            );

            if (hasAlternate) {
              chunks.push(
                ...flattenBody(
                  [
                    ...stmt.alternate.body,
                    {
                      type: "GotoStatement",
                      label: afterPath,
                    },
                  ],
                  noPath
                )
              );

              finishCurrentChunk(noPath, afterPath);
            } else {
              finishCurrentChunk(afterPath, afterPath);
            }

            return;
          }

          if (!currentBody.length || Math.random() < fraction) {
            currentBody.push(stmt);
          } else {
            // Start new chunk
            finishCurrentChunk();
            currentBody.push(stmt);
          }
        });

        finishCurrentChunk();
        chunks[chunks.length - 1].body.pop();

        return chunks;
      };

      /**
       * Executable code segments are broken down into `chunks` typically 1-3 statements each
       *
       * Chunked Code has special `GotoStatement` and `StateIdentifier` nodes that get processed later on
       * This allows more complex control structures like `IfStatement`s and `ForStatement`s to be converted into basic
       * conditional jumps and flattened in the switch body
       *
       * IfStatement would be converted like this:
       *
       * MAIN:
       * if ( TEST ) {
       *    GOTO consequent_label;
       * } else? {
       *    GOTO alternate_label;
       * }
       * GOTO NEXT_CHUNK;
       */
      var chunks: Chunk[] = [];

      /**
       * label: switch(a+b+c){...break label...}
       */
      var switchLabel = this.getPlaceholder();

      var innerFnNames = new Set<string>();

      functionDeclarations.forEach((node) => {
        if (node.id && fnNames.has(node.id.name)) {
          var exitStateName = this.getPlaceholder();
          var argumentsName = this.getPlaceholder();

          needsResultAndArgVar = true;

          node.body.body.push(ReturnStatement());

          walk(node.body, [], (o, p) => {
            if (o.type == "ReturnStatement") {
              if (!getFunction(o, p)) {
                return () => {
                  var exitExpr = SequenceExpression([
                    AssignmentExpression(
                      "=",
                      ArrayPattern(stateVars.map(Identifier)),
                      Identifier(exitStateName)
                    ),
                    AssignmentExpression(
                      "=",
                      Identifier(resultVar),
                      o.argument || Identifier("undefined")
                    ),
                  ]);

                  this.replace(o, ReturnStatement(exitExpr));
                };
              }
            }
          });

          var declarations = [
            VariableDeclarator(
              ArrayPattern([
                Identifier(exitStateName),
                Identifier(argumentsName),
              ]),
              Identifier(argVar)
            ),
          ];

          if (node.params.length) {
            declarations.push(
              VariableDeclarator(
                ArrayPattern(node.params),
                Identifier(argumentsName)
              )
            );
          }

          var innerName = this.getPlaceholder();
          innerFnNames.add(innerName);

          chunks.push(
            ...flattenBody(
              [
                FunctionDeclaration(
                  innerName,
                  [],
                  [VariableDeclaration(declarations), ...node.body.body]
                ),
                this.objectAssign(
                  ExpressionStatement(
                    CallExpression(Identifier(innerName), [])
                  ),
                  {
                    $exit: true,
                  } as any
                ),
              ],
              fnToLabel[node.id.name]
            )
          );
        }
      });

      const startLabel = this.getPlaceholder();

      chunks.push(...flattenBody(body, startLabel));
      chunks[chunks.length - 1].body.push({
        type: "GotoStatement",
        label: "END_LABEL",
      });
      chunks.push({
        label: "END_LABEL",
        body: [],
      });

      const endLabel = chunks[Object.keys(chunks).length - 1].label;

      if (!this.isDebug) {
        // DEAD CODE 1/3: Add fake chunks that are never reached
        var fakeChunkCount = getRandomInteger(1, 5);
        for (var i = 0; i < fakeChunkCount; i++) {
          // These chunks just jump somewhere random, they are never executed
          // so it could contain any code
          var fakeChunkBody = [
            // This a fake assignment expression
            ExpressionStatement(
              AssignmentExpression(
                "=",
                Identifier(choice(stateVars)),
                Literal(getRandomInteger(-150, 150))
              )
            ),

            {
              type: "GotoStatement",
              label: choice(chunks).label,
            },
          ];

          chunks.push({
            label: this.getPlaceholder(),
            body: fakeChunkBody,
            impossible: true,
          });
        }

        // DEAD CODE 2/3: Add fake jumps to really mess with deobfuscators
        chunks.forEach((chunk) => {
          if (chance(25)) {
            var randomLabel = choice(chunks).label;

            // The `false` literal will be mangled
            chunk.body.unshift(
              IfStatement(Literal(false), [
                {
                  type: "GotoStatement",
                  label: randomLabel,
                  impossible: true,
                },
              ])
            );
          }
        });

        // DEAD CODE 3/3: Clone chunks but these chunks are never ran
        var cloneChunkCount = getRandomInteger(1, 5);
        for (var i = 0; i < cloneChunkCount; i++) {
          var randomChunk = choice(chunks);
          var clonedChunk = {
            body: clone(randomChunk.body),
            label: this.getPlaceholder(),
            impossible: true,
          };

          // Don't double define functions
          var hasDeclaration = clonedChunk.body.find((stmt) => {
            return (
              stmt.type === "FunctionDeclaration" ||
              stmt.type === "ClassDeclaration"
            );
          });

          if (!hasDeclaration) {
            chunks.unshift(clonedChunk);
          }
        }
      }

      // Generate a unique 'state' number for each chunk
      var caseSelection: Set<number> = new Set();
      var uniqueStatesNeeded = chunks.length;

      do {
        var newState = getRandomInteger(1, chunks.length * 15);
        if (this.isDebug) {
          newState = caseSelection.size;
        }
        caseSelection.add(newState);
      } while (caseSelection.size !== uniqueStatesNeeded);

      ok(caseSelection.size == uniqueStatesNeeded);

      /**
       * The accumulated state values
       *
       * index -> total state value
       */
      var caseStates = Array.from(caseSelection);

      /**
       * The individual state values for each label
       *
       * labels right now are just chunk indexes (numbers)
       *
       * but will expand to if statements and functions when `goto statement` obfuscation is added
       */
      var labelToStates: { [label: string]: number[] } = Object.create(null);

      var lastLabel;

      Object.values(chunks).forEach((chunk, i) => {
        var state = caseStates[i];

        var stateValues = Array(stateVars.length)
          .fill(0)
          .map((_, i) =>
            lastLabel // Try to make state changes not as drastic (If last label, re-use some of it's values)
              ? choice([
                  labelToStates[lastLabel][i],
                  getRandomInteger(-500, 500),
                ])
              : getRandomInteger(-500, 500)
          );

        const getCurrentState = () => {
          return stateValues.reduce((a, b) => b + a, 0);
        };

        var correctIndex = getRandomInteger(0, stateValues.length);
        stateValues[correctIndex] =
          state - (getCurrentState() - stateValues[correctIndex]);

        labelToStates[chunk.label] = stateValues;
        lastLabel = chunk.label;
      });

      var initStateValues = [...labelToStates[startLabel]];
      var endState = labelToStates[endLabel].reduce((a, b) => b + a, 0);

      // This function is recursively called to create complex mangled expressions
      // Example: (state + 50) == 10 ? <NUM> : <FAKE>
      const numberLiteral = (
        num: number,
        depth: number,
        stateValues: number[]
      ): Node => {
        ok(Array.isArray(stateValues));

        // Base case: After 4 depth, OR random chance
        if (depth > 4 || chance(75 + depth * 5 + this.mangledExpressionsMade)) {
          // Add this number to the control object?
          if (chance(25 - controlMap.size)) {
            var key = controlMap.get(num)?.key;

            if (!key) {
              key = controlGen.generate();
              controlMap.set(num, { key: key, label: "?" });

              if (!controlPropertiesByLabel["?"]) {
                controlPropertiesByLabel["?"] = [];
              }

              controlPropertiesByLabel["?"].push(
                Property(Literal(key), Literal(num), false)
              );
            }

            return getControlMember(key);
          }

          return Literal(num);
        }
        this.mangledExpressionsMade++;

        var opposing = getRandomInteger(0, stateVars.length);

        if (chance(25)) {
          // state > compare ? real : fake

          var compareValue: number = choice([
            stateValues[opposing],
            getRandomInteger(-150, 150),
          ]);

          var operator = choice(["<", ">", "==", "!="]);
          var answer: boolean = {
            ">": compareValue > stateValues[opposing],
            "<": compareValue < stateValues[opposing],
            "==": compareValue === stateValues[opposing],
            "!=": compareValue !== stateValues[opposing],
          }[operator];

          var correct = numberLiteral(num, depth + 1, stateValues);
          var incorrect = numberLiteral(
            getRandomInteger(-150, 150),
            depth + 1,
            stateValues
          );

          return ConditionalExpression(
            BinaryExpression(
              operator,
              numberLiteral(compareValue, depth + 1, stateValues),
              Identifier(stateVars[opposing])
            ),
            answer ? correct : incorrect,
            answer ? incorrect : correct
          );
        }

        // state + 10 = <REAL>
        var difference = num - stateValues[opposing];

        return BinaryExpression(
          "+",
          Identifier(stateVars[opposing]),
          numberLiteral(difference, depth + 1, stateValues)
        );
      };

      var outlinesCreated = 0;

      // This function checks if the expression or statements is possible to be outlined
      const canOutline = (object: Node | Node[]) => {
        var isIllegal = false;

        var breakStatements: Location[] = [];
        var returnStatements: Location[] = [];

        walk(object, [], (o, p) => {
          if (
            (o.type === "BreakStatement" ||
              o.type === "ContinueStatement" ||
              o.type === "ThisExpression" ||
              o.type === "MetaProperty" ||
              o.type === "AwaitExpression" ||
              o.type === "YieldExpression" ||
              o.type === "ReturnStatement" ||
              o.type === "VariableDeclaration" ||
              o.type === "FunctionDeclaration" ||
              o.type === "ClassDeclaration") &&
            !p.find((x) => isVarContext(x))
          ) {
            // This can be safely outlined
            if (
              o.type === "BreakStatement" &&
              o.label &&
              o.label.name === switchLabel
            ) {
              breakStatements.push([o, p]);
            } else if (o.type === "ReturnStatement") {
              returnStatements.push([o, p]);
            } else {
              isIllegal = true;
              return "EXIT";
            }
          }

          if (o.type === "Identifier") {
            if (
              illegalFnNames.has(o.name) ||
              fnNames.has(o.name) ||
              innerFnNames.has(o.name) ||
              o.name === "arguments"
            ) {
              isIllegal = true;
              return "EXIT";
            }
          }
        });

        return { isIllegal, breakStatements, returnStatements };
      };

      const createOutlineFunction = (body: Node[], label: string) => {
        var key = controlGen.generate();

        var functionExpression = FunctionExpression([], body);

        if (!controlPropertiesByLabel[label]) {
          controlPropertiesByLabel[label] = [];
        }
        controlPropertiesByLabel[label].push(
          Property(Literal(key), functionExpression, false)
        );

        return key;
      };

      const attemptOutlineStatements = (
        statements: Node[],
        parentBlock: Node[],
        label: string
      ) => {
        if (
          this.isDebug ||
          !this.outlineStatements ||
          chance(75 + outlinesCreated)
        ) {
          return;
        }

        var index = parentBlock.indexOf(statements[0]);
        if (index === -1) return;

        var outlineInfo = canOutline(statements);
        if (outlineInfo.isIllegal) return;

        var breakFlag = controlGen.generate();

        outlineInfo.breakStatements.forEach(([breakStatement, p]) => {
          this.replace(breakStatement, ReturnStatement(Literal(breakFlag)));
        });

        var returnFlag = controlGen.generate();

        outlineInfo.returnStatements.forEach(([returnStatement, p]) => {
          var argument = returnStatement.argument || Identifier("undefined");

          this.replace(
            returnStatement,
            ReturnStatement(
              ObjectExpression([Property(Literal(returnFlag), argument, false)])
            )
          );
        });

        outlinesCreated++;

        // Outline these statements!
        var key = createOutlineFunction(clone(statements), label);
        var callExpression = CallExpression(getControlMember(key), []);

        var newStatements: Node[] = [];
        if (
          outlineInfo.breakStatements.length === 0 &&
          outlineInfo.returnStatements.length === 0
        ) {
          newStatements.push(ExpressionStatement(callExpression));
        } else if (outlineInfo.returnStatements.length === 0) {
          newStatements.push(
            IfStatement(
              BinaryExpression("==", callExpression, Literal(breakFlag)),
              [BreakStatement(switchLabel)]
            )
          );
        } else {
          var tempVar = this.getPlaceholder();
          newStatements.push(
            VariableDeclaration(VariableDeclarator(tempVar, callExpression))
          );

          const t = (str): Node => Template(str).single().expression;

          newStatements.push(
            IfStatement(
              t(`${tempVar} === "${breakFlag}"`),
              [BreakStatement(switchLabel)],
              [
                IfStatement(t(`typeof ${tempVar} == "object"`), [
                  ReturnStatement(t(`${tempVar}["${returnFlag}"]`)),
                ]),
              ]
            )
          );
        }

        // Remove the original statements from the block and replace it with the call expression
        parentBlock.splice(index, statements.length, ...newStatements);
      };

      const attemptOutlineExpression = (
        expression: Node,
        p: Node[],
        label: string
      ) => {
        if (
          this.isDebug ||
          !this.outlineExpressions ||
          chance(75 + outlinesCreated)
        ) {
          return;
        }

        var outlineInfo = canOutline(expression);
        if (
          outlineInfo.isIllegal ||
          outlineInfo.breakStatements.length ||
          outlineInfo.returnStatements.length
        )
          return;

        outlinesCreated++;

        // Outline this expression!
        var key = createOutlineFunction(
          [ReturnStatement(clone(expression))],
          label
        );

        var callExpression = CallExpression(getControlMember(key), []);

        this.replaceIdentifierOrLiteral(expression, callExpression, p);
      };

      const createTransitionExpression = (
        index: number,
        add: number,
        mutatingStateValues: number[],
        label: string
      ) => {
        var newValue = mutatingStateValues[index] + add;

        var expr = null;

        if (this.isDebug) {
          expr = AssignmentExpression(
            "=",
            Identifier(stateVars[index]),
            Literal(newValue)
          );
        } else if (chance(90)) {
          expr = AssignmentExpression(
            "+=",
            Identifier(stateVars[index]),
            numberLiteral(add, 0, mutatingStateValues)
          );
        } else {
          var double = mutatingStateValues[index] * 2;
          var diff = double - newValue;

          var first = AssignmentExpression(
            "*=",
            Identifier(stateVars[index]),
            numberLiteral(2, 0, mutatingStateValues)
          );
          mutatingStateValues[index] = double;

          expr = SequenceExpression([
            first,
            AssignmentExpression(
              "-=",
              Identifier(stateVars[index]),
              numberLiteral(diff, 0, mutatingStateValues)
            ),
          ]);
        }

        mutatingStateValues[index] = newValue;

        attemptOutlineExpression(expr, [], label);

        return expr;
      };

      interface Case {
        state: number;
        body: Node[];
        order: number;
      }

      var order = Object.create(null);
      var cases: Case[] = [];

      chunks.forEach((chunk, i) => {
        // skip last case, its empty and never ran
        if (chunk.label === endLabel) {
          return;
        }

        ok(labelToStates[chunk.label]);
        var state = caseStates[i];

        var breaksInsertion = [];
        var staticStateValues = [...labelToStates[chunk.label]];
        var potentialBranches = new Set<string>();

        chunk.body.forEach((stmt, stmtIndex) => {
          var addBreak = false;

          walk(stmt, [], (o, p) => {
            if (!this.isDebug) {
              // This mangles certain literals with the state variables
              // Ex: A number literal (50) changed to a expression (stateVar + 40), when stateVar = 10
              if (o.type === "Literal" && !p.find((x) => isVarContext(x))) {
                if (
                  typeof o.value === "number" &&
                  Math.floor(o.value) === o.value && // Only whole numbers
                  Math.abs(o.value) < 100_000 && // Hard-coded limit
                  this.mangleNumberLiterals &&
                  chance(50)
                ) {
                  // 50 -> state1 - 10, when state1 = 60. The result is still 50

                  return () => {
                    this.replaceIdentifierOrLiteral(
                      o,
                      numberLiteral(o.value, 0, staticStateValues),
                      p
                    );
                  };
                }

                if (
                  typeof o.value === "boolean" &&
                  this.mangleBooleanLiterals
                ) {
                  // true -> state1 == 10, when state1 = 10. The result is still true

                  // Choose a random state var to compare again
                  var index = getRandomInteger(0, stateVars.length);

                  var compareValue = staticStateValues[index];

                  // When false, always choose a different number, so the expression always equals false
                  while (
                    !o.value &&
                    compareValue === staticStateValues[index]
                  ) {
                    compareValue = getRandomInteger(-150, 150);
                  }

                  var mangledExpression: Node = BinaryExpression(
                    "==",
                    Identifier(stateVars[index]),
                    numberLiteral(compareValue, 0, staticStateValues)
                  );

                  return () => {
                    this.replaceIdentifierOrLiteral(o, mangledExpression, p);

                    attemptOutlineExpression(o, p, chunk.label);
                  };
                }
              }
            }

            // Mangle certain referenced identifiers
            // console.log("hi") -> (x ? console : window).log("hi"), when is x true. The result is the same
            if (
              o.type === "Identifier" &&
              !p.find((x) => isVarContext(x)) &&
              this.mangleIdentifiers &&
              chance(75 - outlinesCreated)
            ) {
              // ONLY referenced identifiers (like actual variable names) can be changed
              var info = getIdentifierInfo(o, p);
              if (
                !info.spec.isReferenced ||
                info.spec.isDefined ||
                info.spec.isModified ||
                info.spec.isExported
              ) {
                return;
              }

              // TYPEOF expression check
              if (
                p[0] &&
                p[0].type === "UnaryExpression" &&
                p[0].operator === "typeof" &&
                p[0].argument === o
              ) {
                return;
              }

              // FOR-in/of initializer check
              if (isForInitialize(o, p) === "left-hand") {
                return;
              }

              // Choose a random state variable
              var index = getRandomInteger(0, stateVars.length);

              var compareValue = choice([
                staticStateValues[index],
                getRandomInteger(-100, 100),
              ]);

              var test = BinaryExpression(
                "==",
                Identifier(stateVars[index]),
                numberLiteral(compareValue, 0, staticStateValues)
              );
              var testValue = staticStateValues[index] === compareValue;

              var alternateName = choice([
                ...stateVars,
                ...this.options.globalVariables,
                ...reservedIdentifiers,
              ]);

              var mangledExpression: Node = ConditionalExpression(
                test,
                Identifier(testValue ? o.name : alternateName),
                Identifier(!testValue ? o.name : alternateName)
              );

              return () => {
                this.replaceIdentifierOrLiteral(o, mangledExpression, p);
              };
            }

            // Function outlining: bring out certain expressions
            if (
              o.type &&
              [
                "BinaryExpression",
                "LogicalExpression",
                "CallExpression",
                "AssignmentExpression",
                "MemberExpression",
                "ObjectExpression",
              ].includes(o.type) &&
              !p.find((x) => isContext(x) || x.$outlining)
            ) {
              o.$outlining = true;
              return () => {
                attemptOutlineExpression(o, p, chunk.label);
              };
            }

            if (o.type == "StateIdentifier") {
              return () => {
                ok(labelToStates[o.label]);
                this.replace(
                  o,
                  ArrayExpression(labelToStates[o.label].map(Literal))
                );
              };
            }

            if (o.type == "GotoStatement") {
              return () => {
                var blockIndex = p.findIndex((node) => isBlock(node));
                if (blockIndex === -1) {
                  addBreak = true;
                } else {
                  var child = p[blockIndex - 2] || o;
                  var childIndex = p[blockIndex].body.indexOf(child);

                  p[blockIndex].body.splice(
                    childIndex + 1,
                    0,
                    BreakStatement(switchLabel)
                  );
                }

                if (!o.impossible) {
                  potentialBranches.add(o.label);
                }

                var mutatingStateValues = [...labelToStates[chunk.label]];
                var nextStateValues = labelToStates[o.label];
                ok(nextStateValues, o.label);

                var transitionExpressions: Node[] = [];
                for (
                  var stateValueIndex = 0;
                  stateValueIndex < stateVars.length;
                  stateValueIndex++
                ) {
                  var diff =
                    nextStateValues[stateValueIndex] -
                    mutatingStateValues[stateValueIndex];

                  // Only add if state value changed
                  // If pointing to itself then always add to ensure SequenceExpression isn't empty
                  if (diff !== 0 || o.label === chunk.label) {
                    transitionExpressions.push(
                      createTransitionExpression(
                        stateValueIndex,
                        diff,
                        mutatingStateValues,
                        chunk.label
                      )
                    );
                  }
                }

                ok(transitionExpressions.length !== 0);

                var sequenceExpression = SequenceExpression(
                  transitionExpressions
                );
                attemptOutlineExpression(sequenceExpression, [], chunk.label);

                this.replace(o, ExpressionStatement(sequenceExpression));
              };
            }
          });

          if (addBreak) {
            breaksInsertion.push(stmtIndex);
          }
        });

        breaksInsertion.sort();
        breaksInsertion.reverse();

        breaksInsertion.forEach((index) => {
          chunk.body.splice(index + 1, 0, BreakStatement(switchLabel));
        });

        attemptOutlineStatements(chunk.body, chunk.body, chunk.label);

        if (!chunk.impossible) {
          // var neededKeys = new Map<string, string>();
          // for (var branch of Array.from(potentialBranches)) {
          //   var properties = controlPropertiesByLabel[branch];
          //   if (properties) {
          //     properties.forEach((property) => {
          //       neededKeys.set(property.key.value, branch);
          //     });
          //   }
          // }
          // if (neededKeys.size > 0) {
          //   chunk.body.unshift(
          //     ExpressionStatement(
          //       SequenceExpression(
          //         Array.from(neededKeys).map(([key, label]) => {
          //           var value = controlPropertiesByLabel[label].find(
          //             (prop) => prop.key.value === key
          //           )?.value;
          //           controlDynamicKeys.add(key);
          //           return AssignmentExpression(
          //             "=",
          //             getControlMember(key),
          //             value
          //           );
          //         })
          //       )
          //     )
          //   );
          // }
        }

        var caseObject = {
          body: chunk.body,
          state: state,
          order: i,
        };
        order[i] = caseObject;

        cases.push(caseObject);
      });

      // Half of the control keys will be added in the first block of code
      var initialControlKeys = new Map<string, Node>();
      Object.keys(controlPropertiesByLabel).forEach((label) => {
        controlPropertiesByLabel[label].forEach((property) => {
          var key = property.key.value;
          if (typeof key === "string") {
            if (chance(50)) {
              initialControlKeys.set(key, property.value);
              controlDynamicKeys.add(key);
            }
          }
        });
      });

      if (!this.isDebug) {
        // Add fake control object updates
        chunks.forEach((chunk) => {
          if (chance(10)) {
            chunk.body.unshift(
              choice([
                ExpressionStatement(
                  AssignmentExpression(
                    "=",
                    getControlMember(controlGen.generate()),
                    Literal(controlGen.generate())
                  )
                ),
                ExpressionStatement(
                  UnaryExpression(
                    "delete",
                    getControlMember(controlGen.generate())
                  )
                ),
              ])
            );
          }
        });
      }

      if (initialControlKeys.size) {
        chunks
          .find((x) => x.label === startLabel)
          .body.unshift(
            ExpressionStatement(
              SequenceExpression(
                Array.from(initialControlKeys).map(([key, value]) => {
                  return AssignmentExpression(
                    "=",
                    getControlMember(key),
                    value
                  );
                })
              )
            )
          );
      }

      if (!this.isDebug) {
        shuffle(cases);
      }

      var discriminant = Template(`${stateVars.join("+")}`).single().expression;

      body.length = 0;
      for (var importDeclaration of importDeclarations) {
        body.push(importDeclaration);
      }

      if (functionDeclarations.size) {
        functionDeclarations.forEach((x) => {
          if (!x.id || illegalFnNames.has(x.id.name)) {
            body.push(clone(x));
          }
        });
      }

      var defaultCase = getRandomInteger(0, cases.length);

      attemptOutlineExpression(discriminant, [], startLabel);

      var switchStatement: Node = SwitchStatement(
        discriminant,
        cases.map((x, i) => {
          var statements = [];

          statements.push(...x.body);

          var test = Literal(x.state);

          // One random case gets to be default
          if (i === defaultCase) test = null;

          return SwitchCase(test, statements);
        })
      );

      var declarations = [];

      if (needsTestVar) {
        declarations.push(VariableDeclarator(testVar));
      }

      if (needsResultAndArgVar) {
        declarations.push(VariableDeclarator(resultVar));
        declarations.push(VariableDeclarator(argVar));
      }

      declarations.push(
        ...stateVars.map((stateVar, i) => {
          return VariableDeclarator(stateVar, Literal(initStateValues[i]));
        })
      );

      declarations.push(
        VariableDeclarator(
          controlVar,
          ObjectExpression(
            Object.values(controlPropertiesByLabel)
              .flat(1)
              .filter((x) => !controlDynamicKeys.has(x.key.value))
          )
        )
      );

      var whileTest = BinaryExpression(
        "!=",
        clone(discriminant),
        Literal(endState)
      );

      body.push(
        // Use individual variable declarations instead so Stack can apply
        ...declarations.map((declaration) =>
          VariableDeclaration(declaration, "var")
        ),

        WhileStatement(whileTest, [
          LabeledStatement(switchLabel, switchStatement),
        ])
      );

      // mark this object for switch case obfuscation
      switchStatement.$controlFlowFlattening = true;
      this.switchLabels.add(switchLabel);
    };
  }
}
