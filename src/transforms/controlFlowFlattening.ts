import { NodePath, PluginObj, traverse, Visitor } from "@babel/core";
import { PluginArg } from "./plugin";
import { Order } from "../order";
import { computeProbabilityMap } from "../probability";
import {
  ensureComputedExpression,
  getParentFunctionOrProgram,
  getPatternIdentifierNames,
} from "../utils/ast-utils";
import * as t from "@babel/types";
import Template from "../templates/template";
import {
  chance,
  choice,
  getRandomInteger,
  shuffle,
} from "../utils/random-utils";
import { IntGen } from "../utils/IntGen";
import { ok } from "assert";

/**
 * Control-Flow-Flattening breaks your code into Basic Blocks.
 *
 * Basic Blocks are simple statements without any jumps or branches.
 */
export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.ControlFlowFlattening);

  const isDebug = true;

  return {
    visitor: {
      Block: {
        exit(blockPath) {
          if (!blockPath.isProgram()) return;

          const body = blockPath.node.body;
          const blockFnParent = getParentFunctionOrProgram(blockPath);

          let hasContinueOrBreak = false;
          blockPath.traverse({
            "ContinueStatement|BreakStatement"(path) {
              if (getParentFunctionOrProgram(path) === blockFnParent) {
                hasContinueOrBreak = true;
                path.stop();
              }
            },
          });

          if (hasContinueOrBreak) {
            return;
          }

          // Limit how many numbers get entangled
          let mangledNumericLiteralsCreated = 0;

          // Must be at least 3 statements or more
          if (body.length < 3) {
            return;
          }

          // Check user's threshold setting
          if (!computeProbabilityMap(me.options.controlFlowFlattening)) {
            return;
          }

          const prefix = me.getPlaceholder();

          const mainFnName = prefix + "_main";

          const stateVars = new Array(isDebug ? 1 : getRandomInteger(2, 5))
            .fill("")
            .map((_, i) => `${prefix}_state_${i}`);

          const argVar = prefix + "_arg";

          const basicBlocks = new Map<string, BasicBlock>();

          // Map labels to states
          const statIntGen = new IntGen();

          interface BasicBlockOptions {
            topLevel: boolean;
            fnLabel: string;
          }

          /**
           * A Basic Block is a sequence of instructions with no diversion except at the entry and exit points.
           */
          class BasicBlock {
            totalState: number;
            stateValues: number[];

            constructor(
              public label: string,
              public options: BasicBlockOptions,
              public body: t.Statement[] = []
            ) {
              if (isDebug) {
                // States in debug mode are just 1, 2, 3, ...
                this.totalState = basicBlocks.size + 1;
              } else {
                this.totalState = statIntGen.generate();
              }

              // Correct state values
              // Start with random numbers
              this.stateValues = stateVars.map(() =>
                getRandomInteger(-250, 250)
              );

              // Try to re-use old state values to make diffs smaller
              if (basicBlocks.size > 1) {
                const lastBlock = [...basicBlocks.values()].at(-1);
                this.stateValues = lastBlock.stateValues.map((oldValue, i) => {
                  return choice([oldValue, this.stateValues[i]]);
                });
              }

              // Correct one of the values so that the accumulated sum is equal to the state
              const correctIndex = getRandomInteger(0, this.stateValues.length);

              const getCurrentState = () =>
                this.stateValues.reduce((a, b) => a + b, 0);

              // Correct the value
              this.stateValues[correctIndex] =
                this.totalState -
                (getCurrentState() - this.stateValues[correctIndex]);

              ok(getCurrentState() === this.totalState);

              // Store basic block
              basicBlocks.set(label, this);
            }
          }

          const switchLabel = me.getPlaceholder();
          const breakStatement = () => {
            return t.breakStatement(t.identifier(switchLabel));
          };

          const startLabel = me.getPlaceholder();
          const endLabel = me.getPlaceholder();

          let currentBasicBlock = new BasicBlock(startLabel, {
            topLevel: true,
            fnLabel: null,
          });

          interface Metadata {
            label?: string;
            type?: "goto";
          }

          interface NodeMetadata {
            metadata?: Metadata;
          }

          function ControlStatement(metadata: Metadata): t.ExpressionStatement {
            var exprStmt = new Template(
              `ControlStatement()`
            ).single<t.ExpressionStatement>();

            (exprStmt.expression as NodeMetadata).metadata = metadata;

            return exprStmt;
          }

          function GotoControlStatement(label: string) {
            return ControlStatement({
              type: "goto",
              label,
            });
          }

          // Ends the current block and starts a new one
          function endCurrentBasicBlock(
            {
              jumpToNext = true,
              nextLabel = me.getPlaceholder(),
              prevJumpTo = null,
            } = {},
            options: BasicBlockOptions
          ) {
            if (prevJumpTo) {
              currentBasicBlock.body.push(GotoControlStatement(prevJumpTo));
            } else if (jumpToNext) {
              currentBasicBlock.body.push(GotoControlStatement(nextLabel));
            }

            currentBasicBlock = new BasicBlock(nextLabel, options);
          }

          const callableMap = new Map<string, string>();
          const callableOriginalFnMap = new Map<
            string,
            t.FunctionDeclaration
          >();

          const prependNodes = [];

          function flattenIntoBasicBlocks(
            block: t.Block,
            options: BasicBlockOptions
          ) {
            for (const index in block.body) {
              const statement = block.body[index];

              // Keep Imports before everything else
              if (t.isImportDeclaration(statement)) {
                prependNodes.push(statement);
                continue;
              }

              if (t.isClassDeclaration(statement)) {
                prependNodes.push(statement);
                continue;
              }

              // Convert Function Declaration into Basic Blocks
              if (t.isFunctionDeclaration(statement)) {
                const fnName = statement.id.name;

                // Function cannot be redefined
                if (statement.async || statement.generator) {
                  if (options.topLevel) {
                    prependNodes.push(statement);
                  } else {
                    currentBasicBlock.body.push(statement);
                    continue;
                  }
                  continue;
                }

                const isRedefined = callableOriginalFnMap.has(fnName);

                const afterPath = me.getPlaceholder();
                const fnLabel = me.getPlaceholder();

                if (!isRedefined) {
                  callableOriginalFnMap.set(fnName, statement);
                  callableMap.set(fnName, fnLabel);
                } else {
                }

                var oldBasicBlock = currentBasicBlock;

                var newBasicBlockOptions = { topLevel: false, fnLabel };

                endCurrentBasicBlock(
                  {
                    prevJumpTo: afterPath,
                    nextLabel: fnLabel,
                  },
                  newBasicBlockOptions
                );

                let embeddedName = fnLabel + "_" + statement.id.name;
                statement.id.name = embeddedName;

                // Start function body
                currentBasicBlock.body.push(statement);
                currentBasicBlock.body.push(
                  t.returnStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier(embeddedName),
                        t.stringLiteral("call"),
                        true
                      ),
                      [
                        t.thisExpression(),
                        t.spreadElement(t.identifier(argVar)),
                      ]
                    )
                  )
                );

                endCurrentBasicBlock(
                  {
                    jumpToNext: false,
                    nextLabel: afterPath,
                  },
                  options
                );

                oldBasicBlock.body.unshift(
                  t.expressionStatement(
                    t.assignmentExpression(
                      "=",
                      t.identifier(fnName),
                      createBasicBlockFunctionExpression(fnLabel)
                    )
                  )
                );

                if (!isRedefined) {
                  prependNodes.push(
                    t.variableDeclaration("var", [
                      t.variableDeclarator(
                        t.identifier(fnName),
                        createBasicBlockFunctionExpression(fnLabel)
                      ),
                    ])
                  );
                }

                continue;
              }

              // Convert IF statements into Basic Blocks
              if (t.isIfStatement(statement)) {
                function ensureBlockStatement(
                  node: t.Statement
                ): t.BlockStatement {
                  if (t.isBlockStatement(node)) {
                    return node;
                  }
                  return t.blockStatement([node]);
                }

                const test = statement.test;
                const consequent = ensureBlockStatement(statement.consequent);
                const alternate = statement.alternate
                  ? ensureBlockStatement(statement.alternate)
                  : null;

                const consequentLabel = me.getPlaceholder();
                const alternateLabel = alternate ? me.getPlaceholder() : null;
                const afterPath = me.getPlaceholder();

                currentBasicBlock.body.push(
                  t.ifStatement(
                    test,
                    GotoControlStatement(consequentLabel),
                    alternateLabel
                      ? GotoControlStatement(alternateLabel)
                      : GotoControlStatement(afterPath)
                  )
                );

                endCurrentBasicBlock(
                  {
                    jumpToNext: false,
                    nextLabel: consequentLabel,
                  },
                  options
                );

                flattenIntoBasicBlocks(consequent, options);

                if (alternate) {
                  endCurrentBasicBlock(
                    {
                      prevJumpTo: afterPath,
                      nextLabel: alternateLabel,
                    },
                    options
                  );

                  flattenIntoBasicBlocks(alternate, options);
                }

                endCurrentBasicBlock(
                  {
                    prevJumpTo: afterPath,
                    nextLabel: afterPath,
                  },
                  options
                );

                continue;
              }

              if (
                options.topLevel &&
                Number(index) === block.body.length - 1 &&
                t.isExpressionStatement(statement)
              ) {
                // Return the result of the last expression for eval() purposes
                currentBasicBlock.body.push(
                  t.returnStatement(statement.expression)
                );
                continue;
              }

              // 3 or more statements should be split more
              if (
                currentBasicBlock.body.length > 1 &&
                chance(50 + currentBasicBlock.body.length)
              ) {
                endCurrentBasicBlock({}, options);
              }

              currentBasicBlock.body.push(statement);
            }
          }

          // Convert our code into Basic Blocks
          flattenIntoBasicBlocks(blockPath.node, {
            topLevel: true,
            fnLabel: null,
          });

          // Ensure always jumped to the Program end
          endCurrentBasicBlock(
            {
              jumpToNext: true,
              nextLabel: endLabel,
            },
            { topLevel: true, fnLabel: null }
          );

          const topLevelNames = new Set<string>();

          // Remap 'GotoStatement' to actual state assignments and Break statements
          for (const basicBlock of basicBlocks.values()) {
            const { stateValues: currentStateValues } = basicBlock;
            // Wrap the statement in a Babel path to allow traversal

            const visitor: Visitor = {
              FunctionDeclaration: {
                exit(fnPath) {
                  if (!callableMap.has(fnPath.node.id.name)) {
                    return;
                  }

                  var block = fnPath.find((p) =>
                    p.isBlock()
                  ) as NodePath<t.Block>;

                  var oldName = fnPath.node.id.name;
                  var newName = me.getPlaceholder();

                  fnPath.node.id.name = newName;

                  block.node.body.unshift(
                    t.expressionStatement(
                      t.assignmentExpression(
                        "=",
                        t.identifier(oldName),
                        t.identifier(newName)
                      )
                    )
                  );
                },
              },
              // Mangle numbers with the state values
              NumericLiteral: {
                exit(numPath) {
                  // Don't mangle numbers in debug mode
                  if (isDebug) return;

                  const num = numPath.node.value;
                  if (
                    Math.floor(num) !== num ||
                    Math.abs(num) > 100_000 ||
                    !Number.isFinite(num) ||
                    Number.isNaN(num)
                  )
                    return;

                  const numFnParent = getParentFunctionOrProgram(numPath);
                  if (!numFnParent.isProgram()) return;

                  if (chance(50 + mangledNumericLiteralsCreated)) return;

                  mangledNumericLiteralsCreated++;

                  const index = getRandomInteger(0, stateVars.length - 1);
                  const stateVar = stateVars[index];

                  // num = 50
                  // stateVar = 30
                  // stateVar + 30

                  const diff = t.binaryExpression(
                    "+",
                    t.identifier(stateVar),
                    t.numericLiteral(num - currentStateValues[index])
                  );

                  ensureComputedExpression(numPath);

                  numPath.replaceWith(diff);
                  numPath.skip();
                },
              },

              BindingIdentifier: {
                exit(path) {
                  if (path.findParent((p) => p.isFunction())) return;

                  const binding = path.scope.getBinding(path.node.name);
                  if (!binding) return;

                  if (!basicBlock.options.topLevel) {
                    return;
                  }

                  if (!callableMap.has(path.node.name)) {
                    topLevelNames.add(path.node.name);
                  }

                  // Variable declaration -> Assignment expression
                  var variableDeclaration = path.findParent((p) =>
                    p.isVariableDeclaration()
                  ) as NodePath<t.VariableDeclaration>;
                  if (!variableDeclaration) return;

                  var wrapInExpressionStatement = true;

                  if (variableDeclaration.parentPath.isForStatement()) {
                    if (variableDeclaration.node.kind === "var") {
                      wrapInExpressionStatement = false;
                    } else {
                      // 'let'/'const' don't get extracted
                      return;
                    }
                  }

                  ok(variableDeclaration.node.declarations.length === 1);

                  const assignment = t.assignmentExpression(
                    "=",
                    variableDeclaration.node.declarations[0].id,
                    variableDeclaration.node.declarations[0].init ||
                      t.identifier("undefined")
                  );

                  // Replace variable declaration with assignment expression
                  variableDeclaration.replaceWith(
                    wrapInExpressionStatement
                      ? t.expressionStatement(assignment)
                      : assignment
                  );
                },
              },

              CallExpression: {
                exit(path) {
                  if (
                    t.isIdentifier(path.node.callee) &&
                    path.node.callee.name === "ControlStatement"
                  ) {
                    const metadata = (path.node as any).metadata as Metadata;
                    ok(metadata);

                    const { label, type } = metadata;
                    ok(["goto"].includes(type));

                    switch (type) {
                      case "goto":
                        const { stateValues: newStateValues } =
                          basicBlocks.get(label);

                        const assignments = [];

                        for (let i = 0; i < stateVars.length; i++) {
                          const oldValue = currentStateValues[i];
                          const newValue = newStateValues[i];
                          if (oldValue === newValue) continue; // No diff needed if the value doesn't change

                          let assignment = t.assignmentExpression(
                            "=",
                            t.identifier(stateVars[i]),
                            t.numericLiteral(newValue)
                          );

                          if (!isDebug) {
                            // Use diffs to create confusing code
                            assignment = t.assignmentExpression(
                              "+=",
                              t.identifier(stateVars[i]),
                              t.numericLiteral(newValue - oldValue)
                            );
                          }

                          assignments.push(assignment);
                        }

                        path.parentPath
                          .replaceWith(
                            t.expressionStatement(
                              t.sequenceExpression(assignments)
                            )
                          )[0]
                          .skip();

                        // Debugging information
                        // console.log("Path:", path);
                        // console.log("ParentPath:", path.parentPath);

                        path.insertAfter(breakStatement());

                        break;
                    }
                  }
                },
              },
            };

            traverse(t.file(t.program(basicBlock.body)), visitor);
          }

          let switchCases: t.SwitchCase[] = [];
          let blocks = Array.from(basicBlocks.values());
          if (!isDebug) {
            shuffle(blocks);
          }
          for (const block of blocks) {
            if (block.label === endLabel) {
              ok(block.body.length === 0);
              continue;
            }

            const tests = [t.numericLiteral(block.totalState)];

            if (!isDebug) {
              // Add some random numbers to confuse the switch statement
              for (let i = 0; i < getRandomInteger(1, 3); i++) {
                tests.push(t.numericLiteral(statIntGen.generate()));
              }

              shuffle(tests);
            }

            const lastTest = tests.pop();

            for (var test of tests) {
              switchCases.push(t.switchCase(test, []));
            }

            switchCases.push(t.switchCase(lastTest, block.body));
          }

          if (!isDebug) {
            // A random test can be 'default'
            choice(switchCases).test = null;
          }

          const discriminant = new Template(`
            ${stateVars.join(" + ")}
          `).expression<t.Expression>();

          // Create a new SwitchStatement
          const switchStatement = t.labeledStatement(
            t.identifier(switchLabel),
            t.switchStatement(discriminant, switchCases)
          );

          const startStateValues = basicBlocks.get(startLabel).stateValues;
          const endTotalState = basicBlocks.get(endLabel).totalState;

          const whileStatement = t.whileStatement(
            t.binaryExpression(
              "!==",
              t.cloneNode(discriminant),
              t.numericLiteral(endTotalState)
            ),
            t.blockStatement([switchStatement])
          );

          function variableDeclaration(name: string, value?: t.Expression) {
            return t.variableDeclaration("var", [
              t.variableDeclarator(t.identifier(name), value),
            ]);
          }

          const variableDeclarations: t.Statement[] = [
            ...Array.from(topLevelNames).map((name) =>
              variableDeclaration(name)
            ),
          ];

          function createBasicBlockFunctionExpression(label: string) {
            return t.functionExpression(
              null,
              [t.restElement(t.identifier(argVar))],
              t.blockStatement([
                t.returnStatement(
                  t.callExpression(
                    t.memberExpression(
                      t.identifier(mainFnName),
                      t.stringLiteral("call"),
                      true
                    ),
                    [
                      t.thisExpression(),
                      ...basicBlocks
                        .get(label)
                        .stateValues.map((stateValue) =>
                          t.numericLiteral(stateValue)
                        ),
                      t.identifier(argVar),
                    ]
                  )
                ),
              ])
            );
          }

          const mainFnDeclaration = t.functionDeclaration(
            t.identifier(mainFnName),
            [
              ...stateVars.map((stateVar) => t.identifier(stateVar)),
              t.identifier(argVar),
            ],
            t.blockStatement([whileStatement])
          );

          blockPath.node.body = [
            ...prependNodes,
            ...variableDeclarations,
            mainFnDeclaration,
            t.expressionStatement(
              t.callExpression(t.identifier(mainFnName), [
                ...startStateValues.map((stateValue) =>
                  t.numericLiteral(stateValue)
                ),
              ])
            ),
          ];

          // Register new declarations
          for (var node of blockPath.get("body")) {
            blockPath.scope.registerDeclaration(node);
          }
        },
      },
    },
  };
};
