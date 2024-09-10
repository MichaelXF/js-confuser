import { PluginObj } from "@babel/core";
import { NodePath, Scope, Visitor } from "@babel/traverse";
import { PluginArg } from "./plugin";
import { Order } from "../order";
import { computeProbabilityMap } from "../probability";
import {
  ensureComputedExpression,
  getFunctionName,
  getParentFunctionOrProgram,
  isDefiningIdentifier,
  isStrictIdentifier,
} from "../utils/ast-utils";
import * as t from "@babel/types";
import * as n from "../utils/node";
import Template from "../templates/template";
import {
  chance,
  choice,
  getRandomInteger,
  shuffle,
} from "../utils/random-utils";
import { IntGen } from "../utils/IntGen";
import { ok } from "assert";
import { NameGen } from "../utils/NameGen";
import { NodeSymbol, UNSAFE } from "../constants";

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
export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.ControlFlowFlattening);

  const isDebug = false;
  const flattenIfStatements = true;
  const addRelativeAssignments = true;
  const addDeadCode = true;
  const addFakeTests = true;
  const addComplexTests = true;
  const mangleNumericalLiterals = true;
  const mangleBooleanLiterals = true;

  const cffPrefix = me.getPlaceholder();
  let cffCounter = 0;

  return {
    visitor: {
      "Program|Function": {
        exit(_path) {
          let programOrFunctionPath = _path as NodePath<t.Program | t.Function>;

          let programPath = _path.isProgram() ? _path : null;
          let functionPath = _path.isFunction() ? _path : null;

          let blockPath: NodePath<t.Block>;
          if (programPath) {
            blockPath = programPath;
          } else {
            var fnBlockPath = functionPath.get("body");
            if (!fnBlockPath.isBlock()) return;
            blockPath = fnBlockPath;
          }

          // Must be at least 3 statements or more
          if (blockPath.node.body.length < 3) return;

          // Check user's threshold setting
          if (!computeProbabilityMap(me.options.controlFlowFlattening)) {
            return;
          }

          // Avoid unsafe functions
          if (functionPath && (functionPath.node as NodeSymbol)[UNSAFE]) return;

          programOrFunctionPath.scope.crawl();

          const blockFnParent = getParentFunctionOrProgram(blockPath);

          let hasIllegalNode = false;
          var bindingNames = new Set<string>();
          blockPath.traverse({
            "Super|MetaProperty|AwaitExpression|YieldExpression"(path) {
              if (
                getParentFunctionOrProgram(path).node === blockFnParent.node
              ) {
                hasIllegalNode = true;
                path.stop();
              }
            },
            VariableDeclaration(path) {
              if (path.node.declarations.length !== 1) {
                hasIllegalNode = true;
                path.stop();
              }
            },
            BindingIdentifier(path) {
              const binding = path.scope.getBinding(path.node.name);
              if (!binding) return;

              var fnParent = path.getFunctionParent();
              if (
                path.key === "id" &&
                path.parentPath.isFunctionDeclaration()
              ) {
                fnParent = path.parentPath.getFunctionParent();
              }

              if (fnParent !== functionPath) return;

              if (!isDefiningIdentifier(path)) {
                return;
              }

              if (bindingNames.has(path.node.name)) {
                hasIllegalNode = true;
                path.stop();
                return;
              }
              bindingNames.add(path.node.name);
            },
            "BreakStatement|ContinueStatement"(_path) {
              var path = _path as NodePath<
                t.BreakStatement | t.ContinueStatement
              >;
              if (path.node.label) return;

              const parent = path.findParent(
                (p) =>
                  p.isFor() ||
                  p.isWhile() ||
                  (path.isBreakStatement() && p.isSwitchCase()) ||
                  p === blockPath
              );

              if (parent === blockPath) {
                hasIllegalNode = true;
                path.stop();
              }
            },
          });

          if (hasIllegalNode) {
            return;
          }

          // Limit how many numbers get entangled
          let mangledLiteralsCreated = 0;

          const prefix = cffPrefix + "_" + cffCounter++;

          const mainFnName = prefix + "_main";

          const scopeVar = prefix + "_scope";

          const stateVars = new Array(isDebug ? 1 : getRandomInteger(2, 5))
            .fill("")
            .map((_, i) => `${prefix}_state_${i}`);

          const argVar = prefix + "_arg";

          const didReturnVar = prefix + "_return";

          const basicBlocks = new Map<string, BasicBlock>();

          // Map labels to states
          const stateIntGen = new IntGen();

          const defaultBlockPath = blockPath;

          let scopeCounter = 0;

          const scopeNameGen = new NameGen(me.options.identifierGenerator);

          class ScopeManager {
            isNotUsed = true;

            nameMap = new Map<string, string>();
            nameGen = new NameGen(me.options.identifierGenerator);

            preserveNames = new Set<string>();

            getNewName(name: string) {
              if (!this.nameMap.has(name)) {
                let newName = this.nameGen.generate();
                if (isDebug) {
                  newName = "_" + name;
                }
                this.nameMap.set(name, newName);

                // console.log(
                //   "Renaming " +
                //     name +
                //     " to " +
                //     newName +
                //     " : " +
                //     this.scope.path.type
                // );

                return newName;
              }
              return this.nameMap.get(name);
            }

            getMemberExpression(name: string) {
              return t.memberExpression(
                t.memberExpression(
                  t.identifier(scopeVar),
                  t.stringLiteral(this.propertyName),
                  true
                ),
                t.stringLiteral(name),
                true
              );
            }

            propertyName: string;
            constructor(public scope: Scope) {
              this.propertyName = isDebug
                ? "_" + scopeCounter++
                : scopeNameGen.generate();
            }

            get parent() {
              return scopeToScopeManager.get(this.scope.parent);
            }

            getObjectExpression(refreshLabel: string) {
              var refreshScope = basicBlocks.get(refreshLabel).scopeManager;
              var propertyMap: { [property: string]: t.Expression } = {};

              var cursor = this.scope;
              while (cursor) {
                var parentScopeManager = scopeToScopeManager.get(cursor);
                if (parentScopeManager) {
                  propertyMap[parentScopeManager.propertyName] =
                    t.memberExpression(
                      t.identifier(scopeVar),
                      t.stringLiteral(parentScopeManager.propertyName),
                      true
                    );
                }

                cursor = cursor.parent;
              }

              propertyMap[refreshScope.propertyName] = isDebug
                ? new Template(`
                  ({
                    identity: "${refreshScope.propertyName}"
                  })
                    `).expression()
                : t.objectExpression([]);

              var properties: t.ObjectProperty[] = [];
              for (var key in propertyMap) {
                properties.push(
                  t.objectProperty(t.stringLiteral(key), propertyMap[key], true)
                );
              }

              return t.objectExpression(properties);
            }

            hasName(name: string) {
              let cursor: ScopeManager = this;
              while (cursor) {
                if (cursor.nameMap.has(name)) {
                  return true;
                }
                cursor = cursor.parent;
              }

              return false;
            }
          }

          const scopeToScopeManager = new Map<Scope, ScopeManager>();
          /**
           * A Basic Block is a sequence of instructions with no diversion except at the entry and exit points.
           */
          class BasicBlock {
            totalState: number;
            stateValues: number[];

            private createPath() {
              const newPath = NodePath.get<t.BlockStatement, any>({
                hub: this.parentPath.hub,
                parentPath: this.parentPath,
                parent: this.parentPath.node,
                container: this.parentPath.node.body,
                listKey: "body", // Set the correct list key
                key: "virtual", // Set the index of the new node
              } as any);

              newPath.scope = this.parentPath.scope;
              newPath.parentPath = this.parentPath;
              newPath.node = t.blockStatement([]);

              this.thisPath = newPath;
              this.thisNode = newPath.node;
            }

            insertAfter(newNode: t.Statement) {
              this.body.push(newNode);
            }

            get scope() {
              return this.parentPath.scope;
            }

            get scopeManager() {
              return scopeToScopeManager.get(this.scope);
            }

            thisPath: NodePath<t.BlockStatement>;
            thisNode: t.BlockStatement;

            get body(): t.Statement[] {
              return this.thisPath.node.body;
            }

            constructor(
              public label: string,
              public parentPath: NodePath<t.Block>
            ) {
              this.createPath();

              if (isDebug) {
                // States in debug mode are just 1, 2, 3, ...
                this.totalState = basicBlocks.size + 1;
              } else {
                this.totalState = stateIntGen.generate();
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

              // Create a new scope manager if it doesn't exist
              if (!scopeToScopeManager.has(this.scope)) {
                scopeToScopeManager.set(
                  this.scope,
                  new ScopeManager(this.scope)
                );
              }
            }
          }

          const switchLabel = me.getPlaceholder();
          const breakStatement = () => {
            return t.breakStatement(t.identifier(switchLabel));
          };

          const startLabel = me.getPlaceholder();
          const endLabel = me.getPlaceholder();

          let currentBasicBlock = new BasicBlock(startLabel, blockPath);

          const gotoFunctionName =
            "GOTO__" +
            me.getPlaceholder() +
            "__IF_YOU_CAN_READ_THIS_THERE_IS_A_BUG";

          function GotoControlStatement(label: string) {
            return new Template(`
              ${gotoFunctionName}("${label}");
              `).single();
          }

          // Ends the current block and starts a new one
          function endCurrentBasicBlock({
            jumpToNext = true,
            nextLabel = me.getPlaceholder(),
            prevJumpTo = null,
            nextBlockPath = null,
          } = {}) {
            ok(nextBlockPath);

            if (prevJumpTo) {
              currentBasicBlock.insertAfter(GotoControlStatement(prevJumpTo));
            } else if (jumpToNext) {
              currentBasicBlock.insertAfter(GotoControlStatement(nextLabel));
            }

            currentBasicBlock = new BasicBlock(nextLabel, nextBlockPath);
          }

          const prependNodes: t.Statement[] = [];
          const functionExpressions: [
            string,
            string,
            BasicBlock,
            t.FunctionExpression
          ][] = [];

          function flattenIntoBasicBlocks(
            bodyIn: NodePath<t.Statement>[] | NodePath<t.Block>
          ) {
            // if (!Array.isArray(bodyIn) && bodyIn.isBlock()) {
            //   currentBasicBlock.parentPath = bodyIn;
            // }
            const body = Array.isArray(bodyIn) ? bodyIn : bodyIn.get("body");
            const nextBlockPath = Array.isArray(bodyIn)
              ? currentBasicBlock.parentPath
              : bodyIn;

            for (const index in body) {
              const statement = body[index];

              // Keep Imports before everything else
              if (statement.isImportDeclaration()) {
                prependNodes.push(statement.node);
                continue;
              }

              if (statement.isFunctionDeclaration()) {
                const fnName = statement.node.id.name;
                let isIllegal = false;

                if (
                  statement.node.async ||
                  statement.node.generator ||
                  (statement.node as NodeSymbol)[UNSAFE]
                ) {
                  isIllegal = true;
                }
                let oldBasicBlock = currentBasicBlock;
                var fnLabel = me.getPlaceholder();

                let sm = currentBasicBlock.scopeManager;
                let rename = sm.getNewName(fnName);

                sm.scope.bindings[fnName].kind = "var";

                const hoistedBasicBlock = Array.from(basicBlocks.values()).find(
                  (block) => block.parentPath === currentBasicBlock.parentPath
                );

                if (isIllegal) {
                  hoistedBasicBlock.body.unshift(statement.node);
                  continue;
                }

                const functionExpression = t.functionExpression(
                  null,
                  [],
                  t.blockStatement([])
                );
                functionExpressions.push([
                  fnName,
                  fnLabel,
                  currentBasicBlock,
                  functionExpression,
                ]);

                hoistedBasicBlock.body.unshift(
                  t.expressionStatement(
                    t.assignmentExpression(
                      "=",
                      sm.getMemberExpression(rename),
                      functionExpression
                    )
                  )
                );

                const blockStatement = statement.get("body");

                endCurrentBasicBlock({
                  nextLabel: fnLabel,
                  nextBlockPath: blockStatement,
                  jumpToNext: false,
                });
                var fnTopBlock = currentBasicBlock;

                // Implicit return
                blockStatement.node.body.push(
                  t.returnStatement(t.identifier("undefined"))
                );

                flattenIntoBasicBlocks(blockStatement);

                // Debug label
                if (isDebug) {
                  fnTopBlock.body.unshift(
                    t.expressionStatement(
                      t.stringLiteral(
                        "Function " +
                          statement.node.id.name +
                          " -> Renamed to " +
                          rename
                      )
                    )
                  );
                }

                // Unpack parameters
                if (statement.node.params.length > 0) {
                  fnTopBlock.body.unshift(
                    t.variableDeclaration("var", [
                      t.variableDeclarator(
                        t.arrayPattern(statement.node.params),
                        t.identifier(argVar)
                      ),
                    ])
                  );

                  // Change bindings from 'param' to 'var'
                  statement.get("params").forEach((param) => {
                    var ids = param.getBindingIdentifierPaths();
                    // Loop over the record of binding identifiers
                    for (const identifierName in ids) {
                      const identifierPath = ids[identifierName];
                      if (identifierPath.getFunctionParent() === statement) {
                        const binding =
                          statement.scope.getBinding(identifierName);

                        if (binding) {
                          binding.kind = "var";
                        }
                      }
                    }
                  });
                }

                currentBasicBlock = oldBasicBlock;
                continue;
              }

              // Convert IF statements into Basic Blocks
              if (statement.isIfStatement() && flattenIfStatements) {
                const test = statement.get("test");
                const consequent = statement.get("consequent");
                const alternate = statement.get("alternate");

                // Both consequent and alternate are blocks
                if (
                  consequent.isBlockStatement() &&
                  (!alternate.node || alternate.isBlockStatement())
                ) {
                  const consequentLabel = me.getPlaceholder();
                  const alternateLabel = alternate.node
                    ? me.getPlaceholder()
                    : null;
                  const afterPath = me.getPlaceholder();

                  currentBasicBlock.insertAfter(
                    t.ifStatement(
                      test.node,
                      GotoControlStatement(consequentLabel),
                      alternateLabel
                        ? GotoControlStatement(alternateLabel)
                        : GotoControlStatement(afterPath)
                    )
                  );

                  const oldBasicBlock = currentBasicBlock;

                  endCurrentBasicBlock({
                    jumpToNext: false,
                    nextLabel: consequentLabel,
                    nextBlockPath: consequent,
                  });

                  flattenIntoBasicBlocks(consequent);

                  if (alternate.isBlockStatement()) {
                    endCurrentBasicBlock({
                      prevJumpTo: afterPath,
                      nextLabel: alternateLabel,
                      nextBlockPath: alternate,
                    });

                    flattenIntoBasicBlocks(alternate);
                  }

                  endCurrentBasicBlock({
                    prevJumpTo: afterPath,
                    nextLabel: afterPath,
                    nextBlockPath: oldBasicBlock.parentPath,
                  });

                  continue;
                }
              }

              if (
                Number(index) === body.length - 1 &&
                statement.isExpressionStatement() &&
                statement.findParent((p) => p.isBlock()) === blockPath
              ) {
                // Return the result of the last expression for eval() purposes
                currentBasicBlock.insertAfter(
                  t.returnStatement(statement.get("expression").node)
                );
                continue;
              }

              // 3 or more statements should be split more
              if (
                currentBasicBlock.body.length > 1 &&
                chance(50 + currentBasicBlock.body.length)
              ) {
                endCurrentBasicBlock({
                  nextBlockPath: nextBlockPath,
                });
              }

              // console.log(currentBasicBlock.thisPath.type);
              // console.log(currentBasicBlock.body);
              currentBasicBlock.body.push(statement.node);
            }
          }

          // Convert our code into Basic Blocks
          flattenIntoBasicBlocks(blockPath.get("body"));

          // Ensure always jumped to the Program end
          endCurrentBasicBlock({
            jumpToNext: true,
            nextLabel: endLabel,
            nextBlockPath: defaultBlockPath,
          });

          if (!isDebug && addDeadCode) {
            // DEAD CODE 1/3: Add fake chunks that are never reached
            const fakeChunkCount = getRandomInteger(1, 5);
            for (let i = 0; i < fakeChunkCount; i++) {
              // These chunks just jump somewhere random, they are never executed
              // so it could contain any code
              const fakeBlock = new BasicBlock(me.getPlaceholder(), blockPath);
              fakeBlock.insertAfter(
                GotoControlStatement(choice(Array.from(basicBlocks.keys())))
              );
            }

            // DEAD CODE 2/3: Add fake jumps to really mess with deobfuscators
            basicBlocks.forEach((basicBlock) => {
              if (chance(25)) {
                var randomLabel = choice(Array.from(basicBlocks.keys()));

                // The `false` literal will be mangled
                basicBlock.insertAfter(
                  new Template(`
                    if(false){
                    {goto}
                    }
                    `).single({
                    goto: GotoControlStatement(randomLabel),
                  })
                );
              }
            });
            // DEAD CODE 3/3: Clone chunks but these chunks are never ran
            const cloneChunkCount = getRandomInteger(1, 5);
            for (let i = 0; i < cloneChunkCount; i++) {
              let randomChunk = choice(Array.from(basicBlocks.values()));

              // Don't double define functions
              let hasDeclaration = randomChunk.body.find((stmt) => {
                return t.isDeclaration(stmt);
              });

              if (!hasDeclaration) {
                let clonedChunk = new BasicBlock(
                  me.getPlaceholder(),
                  randomChunk.parentPath
                );

                randomChunk.body
                  .map((x) => t.cloneNode(x))
                  .forEach((node) => {
                    clonedChunk.insertAfter(node);
                  });
              }
            }
          }

          const topLevelNames = new Set<string>();

          // Remap 'GotoStatement' to actual state assignments and Break statements
          for (const basicBlock of basicBlocks.values()) {
            const { stateValues: currentStateValues } = basicBlock;
            // Wrap the statement in a Babel path to allow traversal

            const outerFn = getParentFunctionOrProgram(basicBlock.parentPath);

            function isWithinSameFunction(path: NodePath) {
              var fn = getParentFunctionOrProgram(path);
              return fn.node === outerFn.node;
            }

            var visitor: Visitor = {
              BooleanLiteral: {
                exit(boolPath) {
                  // Don't mangle booleans in debug mode
                  if (
                    isDebug ||
                    !mangleBooleanLiterals ||
                    me.isSkipped(boolPath)
                  )
                    return;

                  if (!isWithinSameFunction(boolPath)) return;
                  if (chance(50 + mangledLiteralsCreated)) return;

                  mangledLiteralsCreated++;

                  const index = getRandomInteger(0, stateVars.length - 1);
                  const stateVar = stateVars[index];
                  const stateVarValue = currentStateValues[index];

                  const compareValue = choice([
                    getRandomInteger(-250, 250),
                    stateVarValue,
                  ]);
                  const compareResult = stateVarValue === compareValue;

                  const newExpression = t.binaryExpression(
                    boolPath.node.value === compareResult ? "==" : "!=",
                    t.identifier(stateVar),
                    n.numericLiteral(compareValue)
                  );

                  ensureComputedExpression(boolPath);
                  boolPath.replaceWith(newExpression);
                },
              },
              // Mangle numbers with the state values
              NumericLiteral: {
                exit(numPath) {
                  // Don't mangle numbers in debug mode
                  if (
                    isDebug ||
                    !mangleNumericalLiterals ||
                    me.isSkipped(numPath)
                  )
                    return;

                  const num = numPath.node.value;
                  if (
                    Math.floor(num) !== num ||
                    Math.abs(num) > 100_000 ||
                    !Number.isFinite(num) ||
                    Number.isNaN(num)
                  )
                    return;

                  if (!isWithinSameFunction(numPath)) return;
                  if (chance(50 + mangledLiteralsCreated)) return;

                  mangledLiteralsCreated++;

                  const index = getRandomInteger(0, stateVars.length - 1);
                  const stateVar = stateVars[index];

                  // num = 50
                  // stateVar = 30
                  // stateVar + 30

                  const diff = t.binaryExpression(
                    "+",
                    t.identifier(stateVar),
                    me.skip(n.numericLiteral(num - currentStateValues[index]))
                  );

                  ensureComputedExpression(numPath);

                  numPath.replaceWith(diff);
                  numPath.skip();
                },
              },

              Identifier: {
                exit(path: NodePath<t.Identifier>) {
                  const type = path.isReferenced()
                    ? "referenced"
                    : path.isBindingIdentifier()
                    ? "binding"
                    : null;
                  if (!type) return;

                  var binding = basicBlock.scope.getBinding(path.node.name);
                  if (!binding) return;

                  if (
                    binding.kind === "var" ||
                    binding.kind === "let" ||
                    binding.kind === "const"
                  ) {
                  } else {
                    return;
                  }

                  var scopeManager = scopeToScopeManager.get(binding.scope);
                  if (!scopeManager) return;
                  if (scopeManager.preserveNames.has(path.node.name)) return;

                  let newName = scopeManager.getNewName(path.node.name);

                  const memberExpression: t.Expression =
                    scopeManager.getMemberExpression(newName);

                  scopeManager.isNotUsed = false;

                  if (type === "binding") {
                    if (
                      path.key === "id" &&
                      path.parentPath.isFunctionDeclaration()
                    ) {
                      var asFunctionExpression = t.cloneNode(
                        path.parentPath.node
                      ) as t.Node as t.FunctionExpression;
                      asFunctionExpression.type = "FunctionExpression";

                      path.parentPath.replaceWith(
                        t.expressionStatement(
                          t.assignmentExpression(
                            "=",
                            memberExpression,
                            asFunctionExpression
                          )
                        )
                      );
                      return;
                    } else if (
                      path.key === "id" &&
                      path.parentPath.isClassDeclaration()
                    ) {
                      var asClassExpression = t.cloneNode(
                        path.parentPath.node
                      ) as t.Node as t.ClassExpression;
                      asClassExpression.type = "ClassExpression";

                      path.parentPath.replaceWith(
                        t.expressionStatement(
                          t.assignmentExpression(
                            "=",
                            memberExpression,
                            asClassExpression
                          )
                        )
                      );
                      return;
                    } else {
                      var variableDeclaration = path.find((p) =>
                        p.isVariableDeclaration()
                      ) as NodePath<t.VariableDeclaration>;
                      if (variableDeclaration) {
                        ok(variableDeclaration.node.declarations.length === 1);

                        const first =
                          variableDeclaration.get("declarations")[0];
                        const id = first.get("id");

                        const init = first.get("init");

                        var newExpression: t.Node = id.node;

                        if (init.node) {
                          newExpression = t.assignmentExpression(
                            "=",
                            id.node,
                            init.node
                          );
                        }

                        if (
                          variableDeclaration.key !== "init" &&
                          variableDeclaration.key !== "left"
                        ) {
                          newExpression = t.expressionStatement(
                            newExpression as t.Expression
                          );
                        } else {
                        }

                        variableDeclaration.replaceWith(newExpression);
                        path.replaceWith(memberExpression);

                        return;
                      } else {
                        //ok(false, "Binding not found");
                      }
                    }
                  }

                  if (isStrictIdentifier(path)) {
                    return;
                  }
                  path.replaceWith(memberExpression);
                },
              },

              // Top-level returns set additional flag to indicate that the function has returned
              ReturnStatement: {
                exit(path) {
                  var functionParent = path.getFunctionParent();
                  if (
                    !functionParent ||
                    functionParent.get("body") !== blockPath
                  )
                    return;

                  const returnArgument =
                    path.node.argument || t.identifier("undefined");

                  path.node.argument = new Template(`
                (${didReturnVar} = true, {returnArgument})
                  `).expression({ returnArgument });
                },
              },

              // goto() calls are replaced with state updates and break statements
              CallExpression: {
                exit(path) {
                  if (
                    t.isIdentifier(path.node.callee) &&
                    path.node.callee.name === gotoFunctionName
                  ) {
                    const [labelNode] = path.node.arguments;

                    ok(t.isStringLiteral(labelNode));
                    const label = labelNode.value;

                    const jumpBlock = basicBlocks.get(label);
                    ok(jumpBlock, "Label not found: " + label);

                    const {
                      stateValues: newStateValues,
                      totalState: newTotalState,
                    } = jumpBlock;

                    const assignments = [];

                    for (let i = 0; i < stateVars.length; i++) {
                      const oldValue = currentStateValues[i];
                      const newValue = newStateValues[i];

                      // console.log(oldValue, newValue);
                      if (oldValue === newValue) continue; // No diff needed if the value doesn't change

                      let assignment = t.assignmentExpression(
                        "=",
                        t.identifier(stateVars[i]),
                        n.numericLiteral(newValue)
                      );

                      if (!isDebug && addRelativeAssignments) {
                        // Use diffs to create confusing code
                        assignment = t.assignmentExpression(
                          "+=",
                          t.identifier(stateVars[i]),
                          n.numericLiteral(newValue - oldValue)
                        );
                      }

                      assignments.push(assignment);
                    }

                    // Add debug label
                    if (isDebug) {
                      assignments.unshift(
                        t.stringLiteral("Goto " + newTotalState)
                      );
                    }

                    path.parentPath
                      .replaceWith(
                        t.expressionStatement(t.sequenceExpression(assignments))
                      )[0]
                      .skip();

                    // Add break after updating state variables
                    path.insertAfter(breakStatement());
                  }
                },
              },
            };

            basicBlock.thisPath.traverse(visitor);
          }

          let switchCases: t.SwitchCase[] = [];
          let blocks = Array.from(basicBlocks.values());
          if (!isDebug && addFakeTests) {
            shuffle(blocks);
          }
          for (const block of blocks) {
            if (block.label === endLabel) {
              // ok(block.body.length === 0);
              continue;
            }

            let test: t.Expression = n.numericLiteral(block.totalState);

            // Add complex tests
            if (!isDebug && addComplexTests && chance(25)) {
              // Create complex test expressions for each switch case

              // case STATE+X:
              var stateVarIndex = getRandomInteger(0, stateVars.length);

              var stateValues = block.stateValues;
              var difference = stateValues[stateVarIndex] - block.totalState;

              var conditionNodes: t.Expression[] = [];
              var alreadyConditionedItems = new Set<string>();

              // This code finds clash conditions and adds them to 'conditionNodes' array
              Array.from(basicBlocks.keys()).forEach((label) => {
                if (label !== block.label) {
                  var labelStates = basicBlocks.get(label).stateValues;
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
                          t.binaryExpression(
                            "!=",
                            t.identifier(stateVars[differentIndex]),
                            n.numericLiteral(labelStates[differentIndex])
                          )
                        );
                      }
                    } else {
                      conditionNodes.push(
                        t.binaryExpression(
                          "!=",
                          t.cloneNode(discriminant),
                          n.numericLiteral(totalState)
                        )
                      );
                    }
                  }
                }
              });

              // case STATE!=Y && STATE+X
              test = t.binaryExpression(
                "-",
                t.identifier(stateVars[stateVarIndex]),
                n.numericLiteral(difference)
              );

              // Use the 'conditionNodes' to not cause state clashing issues
              conditionNodes.forEach((conditionNode) => {
                test = t.logicalExpression("&&", conditionNode, test);
              });
            }

            const tests = [test];

            if (!isDebug && addFakeTests) {
              // Add fake tests
              for (let i = 0; i < getRandomInteger(1, 3); i++) {
                tests.push(n.numericLiteral(stateIntGen.generate()));
              }

              shuffle(tests);
            }

            const lastTest = tests.pop();

            for (const test of tests) {
              switchCases.push(t.switchCase(test, []));
            }

            switchCases.push(t.switchCase(lastTest, block.thisPath.node.body));
          }

          if (!isDebug && addFakeTests) {
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
              n.numericLiteral(endTotalState)
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

          var parametersNames: string[] = [...stateVars, argVar, scopeVar];
          var parameters = parametersNames.map((name) => t.identifier(name));

          for (var [
            originalFnName,
            fnLabel,
            basicBlock,
            fn,
          ] of functionExpressions) {
            const { scopeManager } = basicBlock;
            const { stateValues } = basicBlocks.get(fnLabel);

            const argumentsRestName = me.getPlaceholder();

            var argumentsNodes = [];
            for (var parameterName of parametersNames) {
              if (stateVars.includes(parameterName)) {
                argumentsNodes.push(
                  n.numericLiteral(
                    stateValues[stateVars.indexOf(parameterName)]
                  )
                );
              } else if (parameterName === argVar) {
                argumentsNodes.push(t.identifier(argumentsRestName));
              } else if (parameterName === scopeVar) {
                argumentsNodes.push(scopeManager.getObjectExpression(fnLabel));
              } else {
                ok(false);
              }
            }

            Object.assign(
              fn,
              new Template(`
              (function (...${argumentsRestName}){
                ${
                  isDebug
                    ? `"Calling ${originalFnName}, Label: ${fnLabel}";`
                    : ""
                }
                return {callExpression}
              })
              
              `).expression({
                callExpression: t.callExpression(
                  t.identifier(mainFnName),
                  argumentsNodes
                ),
              })
            );
          }

          const mainFnDeclaration = t.functionDeclaration(
            t.identifier(mainFnName),
            parameters,
            t.blockStatement([whileStatement])
          );

          var startProgramExpression = t.callExpression(
            t.identifier(mainFnName),
            [
              ...startStateValues.map((stateValue) =>
                n.numericLiteral(stateValue)
              ),
              t.identifier("undefined"),
              basicBlocks
                .get(startLabel)
                .scopeManager.getObjectExpression(startLabel),
            ]
          );

          var resultVar = me.getPlaceholder();
          var allowReturns = blockPath.find((p) => p.isFunction());

          const stateProgramStatements = new Template(`
            var ${didReturnVar};
            var ${resultVar} = {startProgramExpression};
            ${
              allowReturns
                ? `
            if(${didReturnVar}){
              return ${resultVar};
            }`
                : ""
            }
          `).compile({ startProgramExpression: startProgramExpression });

          blockPath.node.body = [
            ...prependNodes,
            ...variableDeclarations,
            mainFnDeclaration,
            ...stateProgramStatements,
          ];

          // Reset all bindings here
          blockPath.scope.bindings = Object.create(null);

          // Register new declarations
          for (var node of blockPath.get("body")) {
            blockPath.scope.registerDeclaration(node);
          }
        },
      },
    },
  };
};
