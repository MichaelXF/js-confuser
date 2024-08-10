import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { ComputeProbabilityMap } from "../../probability";
import Template from "../../templates/template";
import { isBlock, walk } from "../../traverse";
import {
  ArrayExpression,
  AssignmentExpression,
  AssignmentPattern,
  BinaryExpression,
  BreakStatement,
  CallExpression,
  ConditionalExpression,
  ExpressionStatement,
  FunctionExpression,
  Identifier,
  IfStatement,
  LabeledStatement,
  Literal,
  Location,
  LogicalExpression,
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
  isContext,
  isForInitialize,
  isFunction,
  isVarContext,
} from "../../util/insert";
import { chance, choice, getRandomInteger, shuffle } from "../../util/random";
import Transform from "../transform";
import ExpressionObfuscation from "./expressionObfuscation";
import { reservedIdentifiers, variableFunctionName } from "../../constants";
import { isDirective, isModuleSource } from "../../util/compare";
import { isJSConfuserVar } from "../../util/guard";

const flattenStructures = new Set([
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
  flattenControlStructures = true; // Flatten if-statements, for-loops, etc
  addToControlObject = true; // var control = { str1, num1 }
  mangleNumberLiterals = true; // 50 => state + X
  mangleBooleanLiterals = true; // true => state == X
  mangleIdentifiers = true; // console => (state == X ? console : _)
  outlineStatements = true; // Tries to outline entire chunks
  outlineExpressions = true; // Tries to outline expressions found in chunks
  addComplexTest = true; // case s != 49 && s - 10:
  addFakeTest = true; // case 100: case 490: case 510: ...
  addDeadCode = true; // add fakes chunks of code
  addOpaquePredicates = true; // predicate ? REAL : FAKE
  addFlaggedLabels = true; // s=NEXT_STATE,flag=true,break

  // Limit amount of mangling
  mangledExpressionsMade = 0;

  // Amount of blocks changed by Control Flow Flattening
  cffCount = 0;

  constructor(o) {
    super(o, ObfuscateOrder.ControlFlowFlattening);

    if (!this.isDebug) {
      this.before.push(new ExpressionObfuscation(o));
    } else {
      console.warn("Debug mode enabled");
    }
  }

  match(object, parents) {
    return (
      isBlock(object) &&
      (!parents[0] || !flattenStructures.has(parents[0].type)) &&
      (!parents[1] || !flattenStructures.has(parents[1].type))
    );
  }

  transform(object, parents) {
    // Must be at least 3 statements or more
    if (object.body.length < 3) {
      return;
    }
    // No 'let'/'const' allowed (These won't work in Switch cases!)
    if (containsLexicallyBoundVariables(object, parents)) {
      return;
    }
    // Check user's threshold setting
    if (!ComputeProbabilityMap(this.options.controlFlowFlattening, (x) => x)) {
      return;
    }

    var objectBody = getBlockBody(object.body);
    if (!objectBody.length) {
      return;
    }

    // Purely for naming purposes
    var cffIndex = this.cffCount++;

    // The controlVar is an object containing:
    // - Strings found in chunks
    // - Numbers found in chunks
    // - Helper functions to adjust the state
    // - Outlined expressions changed into functions
    var controlVar = this.getPlaceholder() + `_c${cffIndex}_CONTROL`;
    var controlProperties: Node[] = [];
    var controlConstantMap = new Map<string | number, { key: string }>();
    var controlGen = this.getGenerator("mangled");
    var controlTestKey = controlGen.generate();

    // This 'controlVar' can be accessed by child-nodes
    object.$controlVar = controlVar;
    object.$controlConstantMap = controlConstantMap;
    object.$controlProperties = controlProperties;
    object.$controlGen = controlGen;

    return () => {
      ok(Array.isArray(objectBody));

      // The state variable names (and quantity)
      var stateVars = Array(this.isDebug ? 1 : getRandomInteger(2, 5))
        .fill(0)
        .map((_, i) => this.getPlaceholder() + `_c${cffIndex}_S${i}`);

      // How often should chunks be split up?
      // Percentage between 10% and 90% based on block size
      var splitPercent = Math.max(10, 90 - objectBody.length * 5);

      // Find functions and import declarations
      var importDeclarations: Node[] = [];
      var functionDeclarationNames = new Set<string>();
      var functionDeclarationValues = new Map<string, Node>();

      // Find all parent control-nodes
      const allControlNodes = [object];
      parents
        .filter((x) => x.$controlVar)
        .forEach((node) => allControlNodes.push(node));

      const addControlMapConstant = (literalValue: number | string) => {
        // Choose a random control node to add to
        var controlNode = choice(allControlNodes);
        var selectedControlVar = controlNode.$controlVar;
        var selectedControlConstantMap = controlNode.$controlConstantMap;
        var selectedControlProperties = controlNode.$controlProperties;

        var key = selectedControlConstantMap.get(literalValue)?.key;

        // Not found, create
        if (!key) {
          key = controlNode.$controlGen.generate();
          selectedControlConstantMap.set(literalValue, { key: key });

          selectedControlProperties.push(
            Property(Literal(key), Literal(literalValue), false)
          );
        }

        return getControlMember(key, selectedControlVar);
      };

      // Helper function to easily make control object accessors
      const getControlMember = (key: string, objectName = controlVar) =>
        MemberExpression(Identifier(objectName), Literal(key), true);

      // This function recursively calls itself to flatten and split up code into 'chunks'
      const flattenBody = (body: Node[], startingLabel: string): Chunk[] => {
        var chunks: Chunk[] = [];
        var currentBody: Node[] = [];
        var currentLabel = startingLabel;

        // This function ends the current chunk being created ('currentBody')
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

          // Random chance of this chunk being flagged (First label cannot be flagged)
          if (
            !this.isDebug &&
            this.addFlaggedLabels &&
            currentLabel !== startLabel &&
            chance(25)
          ) {
            flaggedLabels[currentLabel] = {
              flagKey: controlGen.generate(),
              flagValue: choice([true, false]),
            };
          }

          walk(currentBody, [], (o, p) => {
            if (o.type === "Literal" && !this.isDebug) {
              // Add strings to the control object
              if (
                this.addToControlObject &&
                typeof o.value === "string" &&
                o.value.length >= 3 &&
                o.value.length <= 100 &&
                !isModuleSource(o, p) &&
                !isDirective(o, p) &&
                !o.regex &&
                chance(
                  50 -
                    controlConstantMap.size -
                    this.mangledExpressionsMade / 100
                )
              ) {
                return () => {
                  this.replaceIdentifierOrLiteral(
                    o,
                    addControlMapConstant(o.value),
                    p
                  );
                };
              }

              // Add numbers to the control object
              if (
                this.addToControlObject &&
                typeof o.value === "number" &&
                Math.floor(o.value) === o.value &&
                Math.abs(o.value) < 100_000 &&
                chance(
                  50 -
                    controlConstantMap.size -
                    this.mangledExpressionsMade / 100
                )
              ) {
                return () => {
                  this.replaceIdentifierOrLiteral(
                    o,
                    addControlMapConstant(o.value),
                    p
                  );
                };
              }
            }
          });

          currentLabel = newLabel;
          currentBody = [];
        };

        if (body !== objectBody) {
          // This code is nested. Move function declarations up

          var newBody = [];
          for (var stmt of body) {
            if (stmt.type === "FunctionDeclaration") {
              newBody.unshift(stmt);
            } else {
              newBody.push(stmt);
            }
          }

          body = newBody;
        }

        body.forEach((stmt, i) => {
          if (stmt.type === "ImportDeclaration") {
            // The 'importDeclarations' hold statements that are required to be left untouched at the top of the block
            importDeclarations.push(stmt);
            return;
          } else if (stmt.type === "FunctionDeclaration") {
            var functionName = stmt.id.name;

            stmt.type = "FunctionExpression";
            stmt.id = null;

            functionDeclarationNames.add(functionName);
            if (objectBody === body) {
              functionDeclarationValues.set(functionName, stmt);
              return;
            } else {
              currentBody.push(
                ExpressionStatement(
                  AssignmentExpression("=", Identifier(functionName), stmt)
                )
              );
            }

            return;
          } else if (stmt.directive) {
            if (objectBody === body) {
              importDeclarations.push(stmt);
            } else {
              this.error(new Error("Unimplemented directive support."));
            }
            return;
          }

          if (stmt.type == "GotoStatement" && i !== body.length - 1) {
            finishCurrentChunk(stmt.label);
            return;
          }

          // The Preparation transform adds labels to every Control-Flow node
          if (
            this.flattenControlStructures &&
            stmt.type == "LabeledStatement"
          ) {
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
                if (control.cases.length == 0) {
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

              // Find all break; and continue; statements and change them into 'GotoStatement's
              walk(control.body || control.cases, [], (o, p) => {
                if (
                  o.type === "BreakStatement" ||
                  o.type === "ContinueStatement"
                ) {
                  var allowedLabels = new Set(
                    p
                      .filter(
                        (x) =>
                          x.type === "LabeledStatement" &&
                          x.body.type === "SwitchStatement"
                      )
                      .map((x) => x.label.name)
                  );

                  var isUnsupportedContinue =
                    !supportContinueStatement && o.type === "ContinueStatement";

                  var isInvalidLabel =
                    !o.label ||
                    (o.label.name !== lbl && !allowedLabels.has(o.label.name));

                  // This seems like the best solution:
                  if (isUnsupportedContinue || isInvalidLabel) {
                    possible = false;
                    return "EXIT";
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
                var switchDiscriminantName = this.getPlaceholder() + "_switchD"; // Stores the value of the discriminant
                var switchTestName = this.getPlaceholder() + "_switchT"; // Set to true when a Switch case is matched

                currentBody.push(
                  VariableDeclaration(
                    VariableDeclarator(
                      switchDiscriminantName,
                      control.discriminant
                    )
                  )
                );

                currentBody.push(
                  VariableDeclaration(
                    VariableDeclarator(switchTestName, Literal(false))
                  )
                );

                // case labels are:
                // `${caseLabelPrefix}_test_${index}`
                // `${caseLabelPrefix}_entry_${index}`
                var caseLabelPrefix = this.getPlaceholder();
                var defaultCaseIndex = control.cases.findIndex(
                  (x) => x.test === null
                );

                control.cases.forEach((switchCase, i) => {
                  var testPath = caseLabelPrefix + "_test_" + i;
                  var entryPath = caseLabelPrefix + "_entry_" + i;
                  var nextEntryPath =
                    i === control.cases.length - 1 // Last path goes to afterPath
                      ? afterPath // Else go to next entry path (fall-through behavior)
                      : caseLabelPrefix + "_entry_" + (i + 1);
                  var nextTestPath =
                    i === control.cases.length - 1
                      ? afterPath
                      : caseLabelPrefix + "_test_" + (i + 1);

                  finishCurrentChunk(testPath, testPath, i == 0);

                  if (switchCase.test) {
                    // Check the case condition and goto statement
                    currentBody.push(
                      IfStatement(
                        BinaryExpression(
                          "===",
                          Identifier(switchDiscriminantName),
                          switchCase.test
                        ),
                        [
                          ExpressionStatement(
                            AssignmentExpression(
                              "=",
                              Identifier(switchTestName),
                              Literal(true)
                            )
                          ),
                          {
                            type: "GotoStatement",
                            label: entryPath,
                          },
                        ]
                      )
                    );
                  } else {
                    // Default case: No test needed.
                  }

                  // If default case, on last test, if no case was matched, goto default case
                  if (
                    i === control.cases.length - 1 &&
                    defaultCaseIndex !== -1
                  ) {
                    currentBody.push(
                      IfStatement(
                        UnaryExpression("!", Identifier(switchTestName)),
                        [
                          {
                            type: "GotoStatement",
                            label:
                              caseLabelPrefix + "_entry_" + defaultCaseIndex,
                          },
                        ]
                      )
                    );
                  }

                  // Jump to next test
                  currentBody.push({
                    type: "GotoStatement",
                    label: nextTestPath,
                  });

                  chunks.push(
                    ...flattenBody(
                      [
                        ...switchCase.consequent,
                        {
                          type: "GotoStatement",
                          label: nextEntryPath,
                        },
                      ],
                      entryPath
                    )
                  );
                });

                finishCurrentChunk(afterPath, afterPath, false);
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
                      getControlMember(controlTestKey),
                      control.test || Literal(true)
                    )
                  )
                );

                finishCurrentChunk();

                currentBody.push(
                  IfStatement(getControlMember(controlTestKey), [
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
            this.flattenControlStructures &&
            stmt.type == "IfStatement" &&
            stmt.consequent.type == "BlockStatement" &&
            (!stmt.alternate || stmt.alternate.type == "BlockStatement")
          ) {
            finishCurrentChunk();

            currentBody.push(
              ExpressionStatement(
                AssignmentExpression(
                  "=",
                  getControlMember(controlTestKey),
                  stmt.test
                )
              )
            );

            finishCurrentChunk();

            var hasAlternate = !!stmt.alternate;
            ok(!(hasAlternate && stmt.alternate.type !== "BlockStatement"));

            var yesPath = this.getPlaceholder();
            var noPath = this.getPlaceholder();
            var afterPath = this.getPlaceholder();

            currentBody.push(
              IfStatement(getControlMember(controlTestKey), [
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

          if (!currentBody.length || !chance(splitPercent)) {
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
       * Chunked Code has a special `GotoStatement` node that get processed later on
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
      const chunks: Chunk[] = [];

      // Flagged labels have addition code protecting the control state
      const flaggedLabels: {
        [label: string]: { flagKey: string; flagValue: boolean };
      } = Object.create(null);

      /**
       * label: switch(a+b+c){...break label...}
       */
      const switchLabel = this.getPlaceholder();

      const startLabel = this.getPlaceholder();

      chunks.push(...flattenBody(objectBody, startLabel));
      chunks[chunks.length - 1].body.push({
        type: "GotoStatement",
        label: "END_LABEL",
      });
      chunks.push({
        label: "END_LABEL",
        body: [],
      });

      const endLabel = chunks[Object.keys(chunks).length - 1].label;

      if (!this.isDebug && this.addDeadCode) {
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
            lastLabel && chance(95) // Try to make state changes not as drastic (If last label, re-use some of it's values)
              ? labelToStates[lastLabel][i]
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

      // Creates a predicate based on the state-variables and control-object properties
      const createPredicate = (
        stateValues: number[]
      ): { test: Node; testValue: boolean } => {
        this.mangledExpressionsMade++;

        var index = getRandomInteger(0, stateVars.length);

        var compareValue = choice([
          stateValues[index],
          getRandomInteger(-100, 100),
        ]);

        // 'state equality' test
        var test: Node = BinaryExpression(
          "==",
          Identifier(stateVars[index]),
          createStateBoundNumberLiteral(compareValue, stateValues)
        );
        var testValue = stateValues[index] === compareValue;

        // 'control' equality test
        if (controlConstantMap.size && chance(50)) {
          // The controlMap maps LITERAL-values to STRING property names
          var actualValue = choice(Array.from(controlConstantMap.keys()));
          var controlKey = controlConstantMap.get(actualValue)?.key;

          var controlCompareValue = choice([
            actualValue,
            stateValues[index],
            getRandomInteger(-100, 100),
            controlGen.generate(),
          ]);

          // 'control equality' test
          test = BinaryExpression(
            "==",
            getControlMember(controlKey),
            Literal(controlCompareValue)
          );
          testValue = actualValue == controlCompareValue;

          // 'control typeof' test
          if (chance(10)) {
            var compareTypeofValue = choice([
              "number",
              "string",
              "object",
              "function",
              "undefined",
            ]);

            test = BinaryExpression(
              "==",
              UnaryExpression("typeof", getControlMember(controlKey)),
              Literal(compareTypeofValue)
            );
            testValue = typeof actualValue === compareTypeofValue;
          }

          // 'control hasOwnProperty' test
          if (chance(10)) {
            var hasOwnProperty = choice([controlKey, controlGen.generate()]);
            test = CallExpression(
              MemberExpression(
                Identifier(controlVar),
                Literal("hasOwnProperty"),
                true
              ),
              [Literal(hasOwnProperty)]
            );
            testValue = hasOwnProperty === controlKey;
          }
        }

        return { test, testValue };
      };

      // A "state-less" number literal is a Number Literal that is mangled in with the Control properties.
      // Example: X = CONTROL.Y + Z. These can be used anywhere because control properties are constant (unlike state variables)
      const createStatelessNumberLiteral = (num: number, depth = 0) => {
        if (
          !controlConstantMap.size ||
          depth > 4 ||
          chance(75 + depth * 5 + this.mangledExpressionsMade / 25)
        ) {
          // Add to control constant map?
          if (
            chance(
              25 - controlConstantMap.size - this.mangledExpressionsMade / 100
            )
          ) {
            return addControlMapConstant(num);
          }
          return Literal(num);
        }
        this.mangledExpressionsMade++;

        if (controlConstantMap.has(num)) {
          return getControlMember(controlConstantMap.get(num)?.key);
        }

        var allControlNodes = [object];
        parents
          .filter((x) => x.$controlVar && x.$controlConstantMap.size > 0)
          .forEach((node) => allControlNodes.push(node));

        var controlNode = choice(allControlNodes);
        var selectedControlConstantMap = controlNode.$controlConstantMap;
        var selectedControlVar = controlNode.$controlVar;

        var actualValue = choice(Array.from(selectedControlConstantMap.keys()));
        var controlKey = selectedControlConstantMap.get(actualValue)?.key;

        if (typeof actualValue === "number") {
          var difference = actualValue - num;

          return BinaryExpression(
            "-",
            getControlMember(controlKey, selectedControlVar),
            createStatelessNumberLiteral(difference, depth + 1)
          );
        } else if (typeof actualValue === "string") {
          // 'control string length' test
          var compareValue = choice([
            actualValue.length,
            getRandomInteger(0, 50),
          ]);

          var test = BinaryExpression(
            "==",
            MemberExpression(
              getControlMember(controlKey, selectedControlVar),
              Literal("length"),
              true
            ),
            createStatelessNumberLiteral(compareValue, depth + 1)
          );
          var testValue = actualValue.length == compareValue;

          var consequent: Node = createStatelessNumberLiteral(num, depth + 1);
          var alternate: Node = Literal(getRandomInteger(-100, 100));

          return ConditionalExpression(
            test,
            testValue ? consequent : alternate,
            !testValue ? consequent : alternate
          );
        } else {
          throw new Error("Unknown: " + typeof actualValue);
        }
      };

      // A "state-bound" number literal is a Number Literal that is mangled in with the current state variables
      // Example: X = STATE + Y. This can only be used when the state-values are guaranteed to be known.
      const createStateBoundNumberLiteral = (
        num: number,
        stateValues: number[],
        depth = 0
      ): Node => {
        ok(Array.isArray(stateValues));

        // Base case: After 4 depth, OR random chance
        if (
          depth > 4 ||
          chance(75 + depth * 5 + this.mangledExpressionsMade / 25)
        ) {
          // Add this number to the control object?
          // Add to control constant map?
          if (chance(25 - controlConstantMap.size)) {
            return addControlMapConstant(num);
          }

          return Literal(num);
        }
        this.mangledExpressionsMade++;

        if (chance(10)) {
          return createStatelessNumberLiteral(num, depth + 1);
        }

        // Terminated predicate
        if (chance(50)) {
          var { test, testValue } = createPredicate(stateValues);

          var alternateNode = choice([
            Literal(getRandomInteger(-100, 100)),
            Literal(controlGen.generate()),
            getControlMember(controlGen.generate()),
          ]);

          return ConditionalExpression(
            test,
            testValue ? Literal(num) : alternateNode,
            !testValue ? Literal(num) : alternateNode
          );
        }

        // Recursive predicate
        var opposing = getRandomInteger(0, stateVars.length);

        if (chance(10)) {
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

          var correct = createStateBoundNumberLiteral(
            num,
            stateValues,
            depth + 1
          );
          var incorrect = createStateBoundNumberLiteral(
            getRandomInteger(-150, 150),
            stateValues,
            depth + 1
          );

          return ConditionalExpression(
            BinaryExpression(
              operator,
              createStateBoundNumberLiteral(
                compareValue,
                stateValues,
                depth + 1
              ),
              Identifier(stateVars[opposing])
            ),
            answer ? correct : incorrect,
            answer ? incorrect : correct
          );
        }

        // state + 10 = <REAL>
        var difference = num - stateValues[opposing];

        if (difference === 0) {
          return Identifier(stateVars[opposing]);
        }

        return BinaryExpression(
          "+",
          Identifier(stateVars[opposing]),
          createStateBoundNumberLiteral(difference, stateValues, depth + 1)
        );
      };

      var outlinesCreated = 0;

      const isExpression = (object: Node, parents: Node[]) => {
        var fnIndex = parents.findIndex((x) => isFunction(x));
        if (fnIndex != -1) {
          // This does NOT mutate
          parents = parents.slice(0, fnIndex);
        }
        var assignmentIndex = parents.findIndex(
          (x) => x.type === "AssignmentExpression"
        );

        // Left-hand assignment validation
        if (assignmentIndex != -1) {
          if (
            parents[assignmentIndex].left ===
            (parents[assignmentIndex - 1] || object)
          ) {
            return false;
          }
        }

        // For in/of left validation
        var forInOfIndex = parents.findIndex(
          (x) => x.type === "ForInStatement" || x.type === "ForOfStatement"
        );
        if (forInOfIndex != -1) {
          if (
            parents[forInOfIndex].left === (parents[forInOfIndex - 1] || object)
          ) {
            return false;
          }
        }

        // Bound call-expression validation
        var callExpressionIndex = parents.findIndex(
          (x) => x.type === "CallExpression"
        );
        if (callExpressionIndex != -1) {
          if (
            parents[callExpressionIndex].callee ==
            (parents[callExpressionIndex - 1] || object)
          ) {
            var callee = parents[callExpressionIndex].callee;

            // Detected bound call expression. Not supported.
            if (callee.type === "MemberExpression") {
              return false;
            }
          }
        }

        // Update-expression validation:
        var updateExpressionIndex = parents.findIndex(
          (x) => x.type === "UpdateExpression"
        );
        if (updateExpressionIndex !== -1) return false;

        return true;
      };

      // This function checks if the expression or statements is possible to be outlined
      const canOutline = (object: Node | Node[], parents: Node[]) => {
        var isIllegal = false;

        var breakStatements: Location[] = [];
        var returnStatements: Location[] = [];

        if (!Array.isArray(object) && !isExpression(object, parents)) {
          return { isIllegal: true, breakStatements: [], returnStatements: [] };
        }

        walk(object, parents, (o, p) => {
          if (
            o.type === "ThisExpression" ||
            o.type === "MetaProperty" ||
            o.type === "Super"
          ) {
            isIllegal = true;
            return "EXIT";
          }

          if (o.type === "BreakStatement") {
            // This can be safely outlined
            if (o.label && o.label.name === switchLabel) {
              breakStatements.push([o, p]);
            } else {
              isIllegal = true;
              return "EXIT";
            }
          }

          if (
            (o.type === "ContinueStatement" ||
              o.type === "AwaitExpression" ||
              o.type === "YieldExpression" ||
              o.type === "ReturnStatement" ||
              o.type === "VariableDeclaration" ||
              o.type === "FunctionDeclaration" ||
              o.type === "ClassDeclaration") &&
            !p.find((x) => isVarContext(x))
          ) {
            // This can be safely outlined
            if (o.type === "ReturnStatement") {
              returnStatements.push([o, p]);
            } else {
              isIllegal = true;
              return "EXIT";
            }
          }

          if (o.type === "Identifier") {
            if (o.name === "arguments") {
              isIllegal = true;
              return "EXIT";
            }
          }
        });

        return { isIllegal, breakStatements, returnStatements };
      };

      const createOutlineFunction = (
        body: Node[],
        stateValues: number[],
        label: string
      ) => {
        var key = controlGen.generate();

        var functionExpression = FunctionExpression([], body);
        if (!this.options.es5 && chance(50)) {
          functionExpression.type = "ArrowFunctionExpression";
        }

        controlProperties.push(
          Property(Literal(key), functionExpression, false)
        );

        // Add dead code to function
        if (!this.isDebug && chance(25)) {
          var { test, testValue } = createPredicate(stateValues);
          var deadCodeVar = this.getPlaceholder();
          functionExpression.params.push(
            AssignmentPattern(Identifier(deadCodeVar), test)
          );
          var alternate = [
            ReturnStatement(
              choice([
                BinaryExpression(
                  "==",
                  Identifier(choice(stateVars)),
                  Literal(getRandomInteger(-100, 100))
                ),
                Literal(controlGen.generate()),
                Identifier("arguments"),
                Identifier(choice(stateVars)),
                Identifier(controlVar),
                CallExpression(getControlMember(controlGen.generate()), []),
              ])
            ),
          ];

          functionExpression.body.body.unshift(
            IfStatement(
              testValue
                ? UnaryExpression("!", Identifier(deadCodeVar))
                : Identifier(deadCodeVar),
              alternate
            )
          );
        }

        outlinesCreated++;

        return key;
      };

      const attemptOutlineStatements = (
        statements: Node[],
        parentBlock: Node[],
        stateValues: number[],
        label: string
      ) => {
        if (
          this.isDebug ||
          !this.outlineStatements ||
          chance(75 + outlinesCreated - this.mangledExpressionsMade / 25)
        ) {
          return;
        }

        var index = parentBlock.indexOf(statements[0]);
        if (index === -1) return;

        var outlineInfo = canOutline(statements, parentBlock);
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

        // Outline these statements!
        var key = createOutlineFunction(clone(statements), stateValues, label);
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

          const t = (str): Node => new Template(str).single().expression;

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
        expressionParents: Node[],
        stateValues: number[],
        label: string
      ) => {
        if (
          this.isDebug ||
          !this.outlineExpressions ||
          chance(75 + outlinesCreated - this.mangledExpressionsMade / 25)
        ) {
          return;
        }

        var outlineInfo = canOutline(expression, expressionParents);
        if (
          outlineInfo.isIllegal ||
          outlineInfo.breakStatements.length ||
          outlineInfo.returnStatements.length
        )
          return;

        // Outline this expression!
        var key = createOutlineFunction(
          [ReturnStatement(clone(expression))],
          stateValues,
          label
        );

        var callExpression = CallExpression(getControlMember(key), []);

        this.replaceIdentifierOrLiteral(
          expression,
          callExpression,
          expressionParents
        );
      };

      const createTransitionExpression = (
        index: number,
        add: number,
        mutatingStateValues: number[],
        label: string
      ) => {
        var beforeStateValues = [...mutatingStateValues];
        var newValue = mutatingStateValues[index] + add;

        var expr = null;

        if (this.isDebug) {
          // state = NEW_STATE
          expr = AssignmentExpression(
            "=",
            Identifier(stateVars[index]),
            Literal(newValue)
          );
        } else if (chance(90)) {
          // state += (NEW_STATE - CURRENT_STATE)
          expr = AssignmentExpression(
            "+=",
            Identifier(stateVars[index]),
            createStateBoundNumberLiteral(add, mutatingStateValues)
          );
        } else {
          // state *= 2
          // state -= DIFFERENCE
          var double = mutatingStateValues[index] * 2;
          var diff = double - newValue;

          var first = AssignmentExpression(
            "*=",
            Identifier(stateVars[index]),
            createStateBoundNumberLiteral(2, mutatingStateValues)
          );
          mutatingStateValues[index] = double;

          expr = SequenceExpression([
            first,
            AssignmentExpression(
              "-=",
              Identifier(stateVars[index]),
              createStateBoundNumberLiteral(diff, mutatingStateValues)
            ),
          ]);
        }

        mutatingStateValues[index] = newValue;

        // These are lower quality outlines vs. the entire transition outline
        if (chance(50)) {
          attemptOutlineExpression(expr, [], [...beforeStateValues], label);
        }

        return expr;
      };

      interface Case {
        state: number;
        body: Node[];
        label: string;
      }

      var cases: Case[] = [];

      chunks.forEach((chunk, i) => {
        // skip last case, its empty and never ran
        if (chunk.label === endLabel) {
          return;
        }

        ok(labelToStates[chunk.label]);
        var state = caseStates[i];

        var staticStateValues = [...labelToStates[chunk.label]];
        var potentialBranches = new Set<string>();

        [...chunk.body].forEach((stmt) => {
          walk(stmt, [], (o, p) => {
            // This mangles certain literals with the state variables
            // Ex: A number literal (50) changed to a expression (stateVar + 40), when stateVar = 10
            if (
              !this.isDebug &&
              o.type === "Literal" &&
              !p.find((x) => isVarContext(x))
            ) {
              if (
                typeof o.value === "number" &&
                Math.floor(o.value) === o.value && // Only whole numbers
                Math.abs(o.value) < 100_000 && // Hard-coded limit
                this.mangleNumberLiterals &&
                chance(50 - this.mangledExpressionsMade / 100)
              ) {
                // 50 -> state1 - 10, when state1 = 60. The result is still 50

                return () => {
                  this.replaceIdentifierOrLiteral(
                    o,
                    createStateBoundNumberLiteral(o.value, staticStateValues),
                    p
                  );
                };
              }

              if (
                typeof o.value === "boolean" &&
                this.mangleBooleanLiterals &&
                chance(50 - this.mangledExpressionsMade / 100)
              ) {
                // true -> state1 == 10, when state1 = 10. The result is still true

                // Choose a random state var to compare again
                var index = getRandomInteger(0, stateVars.length);

                var compareValue = staticStateValues[index];

                // When false, always choose a different number, so the expression always equals false
                while (!o.value && compareValue === staticStateValues[index]) {
                  compareValue = getRandomInteger(-150, 150);
                }

                var mangledExpression: Node = BinaryExpression(
                  "==",
                  Identifier(stateVars[index]),
                  createStateBoundNumberLiteral(compareValue, staticStateValues)
                );

                return () => {
                  this.replaceIdentifierOrLiteral(o, mangledExpression, p);

                  attemptOutlineExpression(
                    o,
                    p,
                    staticStateValues,
                    chunk.label
                  );
                };
              }
            }

            // Mangle certain referenced identifiers
            // console.log("hi") -> (x ? console : window).log("hi"), when is x true. The result is the same
            if (
              !this.isDebug &&
              o.type === "Identifier" &&
              this.mangleIdentifiers &&
              !reservedIdentifiers.has(o.name) &&
              chance(50 - this.mangledExpressionsMade / 100) &&
              !p.find((x) => isVarContext(x))
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

              // Ignore __JS_CONFUSER_VAR__()
              if (isJSConfuserVar(p)) {
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

              // Update expression check
              if (p[0] && p[0].type === "UpdateExpression") {
                return;
              }

              // FOR-in/of initializer check
              if (isForInitialize(o, p) === "left-hand") {
                return;
              }

              var { test, testValue } = createPredicate(staticStateValues);

              // test && real
              var mangledExpression: Node = LogicalExpression(
                testValue ? "&&" : "||",
                test,
                Identifier(o.name)
              );

              // control.fake = real
              if (chance(50)) {
                mangledExpression = AssignmentExpression(
                  "=",
                  getControlMember(controlGen.generate()),
                  Identifier(o.name)
                );
              }

              // test ? real : fake
              if (chance(50)) {
                var alternateName = choice([
                  controlVar,
                  ...stateVars,
                  ...this.options.globalVariables,
                  ...reservedIdentifiers,
                ]);

                // Don't use 'arguments'
                if (alternateName === "arguments") alternateName = "undefined";

                mangledExpression = ConditionalExpression(
                  test,
                  Identifier(testValue ? o.name : alternateName),
                  Identifier(!testValue ? o.name : alternateName)
                );
              }

              return () => {
                this.replaceIdentifierOrLiteral(o, mangledExpression, p);
              };
            }

            // Function outlining: bring out certain expressions
            if (
              !this.isDebug &&
              o.type &&
              [
                "BinaryExpression",
                "LogicalExpression",
                "CallExpression",
                "AssignmentExpression",
                "MemberExpression",
                "ObjectExpression",
                "ConditionalExpression",
              ].includes(o.type) &&
              !chance(p.length * 5) && // The further down the tree the lower quality of expression
              !p.find((x) => isContext(x) || x.$outlining)
            ) {
              o.$outlining = true;
              return () => {
                attemptOutlineExpression(o, p, staticStateValues, chunk.label);
              };
            }

            // Opaque predicates: If Statements, Conditional Statements, Switch Case test
            if (
              !this.isDebug &&
              this.addOpaquePredicates &&
              p[0] &&
              chance(50 - outlinesCreated - this.mangledExpressionsMade / 100)
            ) {
              var isTestExpression =
                (p[0].type == "IfStatement" && p[0].test === o) ||
                (p[0].type === "ConditionalExpression" && p[0].test === o) ||
                (p[0].type === "SwitchCase" && p[0].test === o);

              if (isTestExpression && !p.find((x) => isContext(x))) {
                return () => {
                  var { test, testValue } = createPredicate(staticStateValues);

                  this.replace(
                    o,
                    LogicalExpression(testValue ? "&&" : "||", test, clone(o))
                  );
                };
              }
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
                var blockIndex = p.findIndex(
                  (node) => isBlock(node) || node.type === "SwitchCase"
                );
                if (blockIndex === -1) {
                  var index = chunk.body.indexOf(stmt);
                  ok(index != -1);

                  // Top level: Insert break statement in the chunk body
                  // This is OKAY because this forEach uses a cloned version of the body `[...chunk.body]`
                  chunk.body.splice(index + 1, 0, BreakStatement(switchLabel));
                } else {
                  var block = p[blockIndex];

                  if (block.type === "SwitchCase") {
                    // Handle switch case break placement (Important!)
                    block.consequent.splice(
                      block.consequent.indexOf(p[blockIndex - 2] || o) + 1,
                      0,
                      BreakStatement(switchLabel)
                    );
                  } else {
                    // Standard block placement
                    var child = p[blockIndex - 2] || o;
                    var childIndex = block.body.indexOf(child);

                    block.body.splice(
                      childIndex + 1,
                      0,
                      BreakStatement(switchLabel)
                    );
                  }
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

                // Check if flagged and additional code here
                if (typeof flaggedLabels[o.label] === "object") {
                  var { flagKey, flagValue } = flaggedLabels[o.label];

                  sequenceExpression.expressions.push(
                    AssignmentExpression(
                      "=",
                      getControlMember(flagKey),
                      Literal(flagValue)
                    )
                  );
                }

                attemptOutlineExpression(
                  sequenceExpression,
                  [],
                  staticStateValues,
                  chunk.label
                );

                this.replace(o, ExpressionStatement(sequenceExpression));
              };
            }
          });
        });

        attemptOutlineStatements(
          chunk.body,
          chunk.body,
          staticStateValues,
          chunk.label
        );

        if (!chunk.impossible) {
          // FUTURE OBFUSCATION IDEA: Update controlObject based on 'potentialBranches' code
          // This idea would require a lot of work but would make some seriously effective obfuscation
          // for protecting the data. In 'inactive' states the data could be overwritten to fake values
          // And in the 'active' state the data would brought back just in time. This would require the controlObject
          // state to be known in all chunks
        }

        var caseObject: Case = {
          body: chunk.body,
          state: state,
          label: chunk.label,
        };

        cases.push(caseObject);
      });

      if (!this.isDebug && this.addDeadCode) {
        // Add fake control object updates
        chunks.forEach((chunk) => {
          if (chance(10)) {
            // These deadCode variants can NOT break the state/control variables
            // They are executed!
            var deadCodeChoices = [
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
            ];

            // These deadCode variants can make breaking changes
            // because they are never ran
            if (chunk.impossible) {
              var randomControlKey =
                choice(
                  controlProperties
                    .map((prop) => prop.key?.value)
                    .filter((x) => x && typeof x === "string")
                ) || controlGen.generate();

              deadCodeChoices = deadCodeChoices.concat([
                ExpressionStatement(
                  AssignmentExpression(
                    "=",
                    Identifier(controlVar),
                    Literal(false)
                  )
                ),
                ExpressionStatement(
                  AssignmentExpression(
                    "=",
                    Identifier(controlVar),
                    Identifier("undefined")
                  )
                ),
                ExpressionStatement(
                  AssignmentExpression(
                    "=",
                    getControlMember(randomControlKey),
                    Identifier("undefined")
                  )
                ),
                ExpressionStatement(
                  UnaryExpression("delete", getControlMember(randomControlKey))
                ),
              ]);
            }

            chunk.body.unshift(choice(deadCodeChoices));
          }
        });
      }

      if (!this.isDebug) {
        shuffle(cases);
        shuffle(controlProperties);
      }

      var discriminant = new Template(`${stateVars.join("+")}`).single()
        .expression;

      objectBody.length = 0;
      // Perverse position of import declarations
      for (var importDeclaration of importDeclarations) {
        objectBody.push(importDeclaration);
      }

      // As well as functions are brought up
      for (var functionName of functionDeclarationNames) {
        objectBody.push(
          VariableDeclaration(
            VariableDeclarator(
              functionName,
              functionDeclarationValues.get(functionName)
            )
          )
        );
      }

      var defaultCaseIndex = getRandomInteger(0, cases.length);
      var switchCases: Node[] = [];

      cases.forEach((caseObject, i) => {
        // Empty case OR single break statement is skipped
        if (
          caseObject.body.length === 0 ||
          (caseObject.body.length === 1 &&
            caseObject.body[0].type === "BreakStatement" &&
            caseObject.body[0].label?.name === switchLabel)
        )
          return;

        var test = Literal(caseObject.state);
        var isEligibleForOutlining = false;

        // Check if Control Map has this value
        if (!this.isDebug && controlConstantMap.has(caseObject.state)) {
          test = getControlMember(
            controlConstantMap.get(caseObject.state)?.key
          );
        }

        // Create complex test expressions for each switch case
        if (!this.isDebug && this.addComplexTest && chance(25)) {
          isEligibleForOutlining = true;

          // case STATE+X:
          var stateVarIndex = getRandomInteger(0, stateVars.length);

          var stateValues = labelToStates[caseObject.label];
          var difference = stateValues[stateVarIndex] - caseObject.state;

          var conditionNodes: Node[] = [];
          var alreadyConditionedItems = new Set<string>();

          // This code finds clash conditions and adds them to 'conditionNodes' array
          Object.keys(labelToStates).forEach((label) => {
            if (label !== caseObject.label) {
              var labelStates = labelToStates[label];
              var totalState = labelStates.reduce((a, b) => a + b, 0);

              if (totalState === labelStates[stateVarIndex] - difference) {
                var differentIndex = labelStates.findIndex(
                  (v, i) => v !== stateValues[i]
                );
                if (differentIndex !== -1) {
                  var expressionAsString =
                    stateVars[differentIndex] +
                    "!=" +
                    labelStates[differentIndex];
                  if (!alreadyConditionedItems.has(expressionAsString)) {
                    alreadyConditionedItems.add(expressionAsString);

                    conditionNodes.push(
                      BinaryExpression(
                        "!=",
                        Identifier(stateVars[differentIndex]),
                        Literal(labelStates[differentIndex])
                      )
                    );
                  }
                } else {
                  conditionNodes.push(
                    BinaryExpression(
                      "!=",
                      clone(discriminant),
                      Literal(totalState)
                    )
                  );
                }
              }
            }
          });

          // case STATE!=Y && STATE+X
          test = BinaryExpression(
            "-",
            Identifier(stateVars[stateVarIndex]),
            Literal(difference)
          );

          // Use the 'conditionNodes' to not cause state clashing issues
          conditionNodes.forEach((conditionNode) => {
            test = LogicalExpression("&&", conditionNode, test);
          });
        }

        // A 'flagged' label has addition 'flagKey' that gets switched before jumped to
        if (flaggedLabels[caseObject.label]) {
          isEligibleForOutlining = true;

          var { flagKey, flagValue } = flaggedLabels[caseObject.label];

          var alternateNum: number;
          do {
            alternateNum = getRandomInteger(-1000, 1000 + chunks.length);
          } while (caseSelection.has(alternateNum));

          var alternate = Literal(alternateNum);

          // case FLAG ? <REAL> : <FAKE>:
          test = ConditionalExpression(
            getControlMember(flagKey),

            flagValue ? test : alternate,
            !flagValue ? test : alternate
          );
        }

        // Outline this switch case test
        if (
          !this.isDebug &&
          this.outlineExpressions &&
          isEligibleForOutlining &&
          chance(75 - outlinesCreated - this.mangledExpressionsMade / 25)
        ) {
          this.mangledExpressionsMade++;

          // Selected a random parent node (or this node) to insert this function in
          var selectedControlNode = choice(allControlNodes);
          var selectedControlProperties =
            selectedControlNode.$controlProperties;
          var selectedControlVar = selectedControlNode.$controlVar;
          var selectedControlGen = selectedControlNode.$controlGen;

          var fnKey = selectedControlGen.generate();

          // Pass in the:
          // - controlVar for 'flagged labels' code check
          // - stateVars for 'complex test expressions'
          // (Check which identifiers are actually needed)
          var argumentList = [],
            watchingFor = new Set([controlVar, ...stateVars]);
          walk(test, [], (o, p) => {
            if (o.type === "Identifier" && watchingFor.has(o.name)) {
              watchingFor.delete(o.name);
              argumentList.push(Identifier(o.name));
            }
          });

          selectedControlProperties.push(
            Property(
              Literal(fnKey),
              FunctionExpression(argumentList, [ReturnStatement(test)]),
              true
            )
          );

          // case control.a(control, s1, s2):
          test = CallExpression(
            getControlMember(fnKey, selectedControlVar),
            clone(argumentList)
          );
        }

        // One random case gets to be default
        if (!this.isDebug && i === defaultCaseIndex) test = null;

        var testArray: Node[] = [test];
        if (!this.isDebug && this.addFakeTest && chance(50)) {
          // Add fake test
          // case <FAKE>:
          // case <REAL>:
          // case <FAKE>:
          var fakeTestCount = getRandomInteger(1, 4);
          for (var i = 0; i < fakeTestCount; i++) {
            // Create a fake test number that doesn't interfere with the actual states
            var fakeTestNum;
            do {
              fakeTestNum = getRandomInteger(1, 1000 + caseSelection.size);
            } while (caseSelection.has(fakeTestNum));

            // Add this fake test
            testArray.push(Literal(fakeTestNum));
          }

          shuffle(testArray);
        }

        testArray.forEach((test, i) => {
          var body = i === testArray.length - 1 ? caseObject.body : [];

          switchCases.push(SwitchCase(test, body));
        });
      });

      // switch(state) { case ... }
      var switchStatement: Node = SwitchStatement(discriminant, switchCases);

      var declarations: Node[] = [];

      // var state = START_STATE
      declarations.push(
        ...stateVars.map((stateVar, i) => {
          return VariableDeclarator(stateVar, Literal(initStateValues[i]));
        })
      );

      // var control = { strings, numbers, outlined functions, etc... }
      var objectExpression = ObjectExpression(controlProperties);
      declarations.push(VariableDeclarator(controlVar, objectExpression));

      objectBody.push(
        // Use individual variable declarations instead so Stack can apply
        ...declarations.map((declaration) =>
          VariableDeclaration(declaration, "var")
        )
      );

      // while (state != END_STATE) {...}
      var whileTest = BinaryExpression(
        "!=",
        clone(discriminant),
        Literal(endState)
      );

      objectBody.push(
        WhileStatement(whileTest, [
          LabeledStatement(switchLabel, switchStatement),
        ])
      );

      // mark this object for switch case obfuscation
      switchStatement.$controlFlowFlattening = true;
    };
  }
}
