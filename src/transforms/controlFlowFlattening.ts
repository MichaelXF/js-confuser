import { PluginObj } from "@babel/core";
import traverse, { NodePath, Scope, Visitor } from "@babel/traverse";
import { PluginArg } from "./plugin";
import { Order } from "../order";
import { computeProbabilityMap } from "../probability";
import {
  ensureComputedExpression,
  getParentFunctionOrProgram,
  isDefiningIdentifier,
  isStrictMode,
  isVariableIdentifier,
} from "../utils/ast-utils";
import * as t from "@babel/types";
import { numericLiteral, deepClone } from "../utils/node";
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
import { NodeSymbol, UNSAFE, NO_RENAME, PREDICTABLE } from "../constants";

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

  // in Debug mode, the output is much easier to read
  const isDebug = false;
  const flattenIfStatements = true; // Converts IF-statements into equivalent 'goto style of code'
  const flattenFunctionDeclarations = true; // Converts Function Declarations into equivalent 'goto style of code'
  const addRelativeAssignments = true; // state += (NEW_STATE - CURRENT_STATE)
  const addDeadCode = true; // add fakes chunks of code
  const addFakeTests = true; // case 100: case 490: case 510: ...
  const addComplexTests = true; // case s != 49 && s - 10:
  const mangleNumericalLiterals = true; // 50 => state + X
  const mangleBooleanLiterals = true; // true => state == X
  const addWithStatement = true; // Disabling not supported yet

  const cffPrefix = me.getPlaceholder();

  // Amount of blocks changed by Control Flow Flattening
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

          // Don't apply to strict mode blocks
          const strictModeEnforcingBlock = programOrFunctionPath.find((path) =>
            isStrictMode(path as NodePath<t.Block>)
          );
          if (strictModeEnforcingBlock) return;

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

          const withIdentifier = (suffix) => {
            var name;
            if (isDebug) {
              name = prefix + "_" + suffix;
            } else {
              name = me.obfuscator.nameGen.generate();
            }

            var id = t.identifier(name);

            (id as NodeSymbol)[NO_RENAME] = name;
            return id;
          };

          const mainFnName = withIdentifier("main");

          const scopeVar = withIdentifier("scope");

          const stateVars = new Array(isDebug ? 1 : getRandomInteger(2, 5))
            .fill("")
            .map((_, i) => withIdentifier(`state_${i}`));

          const argVar = withIdentifier("_arg");

          const didReturnVar = withIdentifier("return");

          const basicBlocks = new Map<string, BasicBlock>();

          // Map labels to states
          const stateIntGen = new IntGen();

          const defaultBlockPath = blockPath;

          let scopeCounter = 0;

          const scopeNameGen = new NameGen(me.options.identifierGenerator);

          const withProperty = isDebug ? "with" : scopeNameGen.generate();
          const withDiscriminant = new Template(
            `${scopeVar.name}["${withProperty}"]`
          ).expression<t.MemberExpression>();

          const resetWithProperty = isDebug
            ? "resetWith"
            : scopeNameGen.generate();

          class ScopeManager {
            isNotUsed = true;
            requiresInitializing = true;

            nameMap = new Map<string, string>();
            nameGen = addWithStatement
              ? me.obfuscator.nameGen
              : new NameGen(me.options.identifierGenerator);

            preserveNames = new Set<string>();

            findUsed(): ScopeManager {
              if (this.isNotUsed) return this.parent?.findUsed();

              return this;
            }

            getNewName(name: string, originalNode?: t.Node) {
              if (!this.nameMap.has(name)) {
                let newName = this.nameGen.generate();
                if (isDebug) {
                  newName = "_" + name;
                }
                if ((originalNode as NodeSymbol)?.[NO_RENAME]) {
                  newName = name;
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

            getScopeObject() {
              return t.memberExpression(
                deepClone(scopeVar),
                t.stringLiteral(this.propertyName),
                true
              );
            }

            getInitializingStatement() {
              return t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  this.getScopeObject(),
                  this.getInitializingObjectExpression()
                )
              );
            }

            getInitializingObjectExpression() {
              return isDebug
                ? new Template(`
                  ({
                    identity: "${this.propertyName}"
                  })
                    `).expression()
                : t.objectExpression([]);
            }

            getMemberExpression(name: string) {
              var memberExpression = t.memberExpression(
                this.getScopeObject(),
                t.stringLiteral(name),
                true
              );

              return memberExpression;
            }

            propertyName: string;
            constructor(
              public scope: Scope,
              public initializingBasicBlock: BasicBlock
            ) {
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
                      deepClone(scopeVar),
                      t.stringLiteral(parentScopeManager.propertyName),
                      true
                    );
                }

                cursor = cursor.parent;
              }

              propertyMap[refreshScope.propertyName] =
                refreshScope.getInitializingObjectExpression();

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
            allowWithDiscriminant = true;
            bestWithDiscriminant: ScopeManager;

            get withDiscriminant() {
              if (!this.allowWithDiscriminant) return null;

              return this.bestWithDiscriminant;
            }

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

            createFalsePredicate(): t.Expression {
              var predicate = this.createPredicate();
              if (predicate.value) {
                // Make predicate false
                return t.unaryExpression("!", predicate.node);
              }
              return predicate.node;
            }

            createTruePredicate(): t.Expression {
              var predicate = this.createPredicate();
              if (!predicate.value) {
                // Make predicate true
                return t.unaryExpression("!", predicate.node);
              }
              return predicate.node;
            }

            createPredicate() {
              var stateVarIndex = getRandomInteger(0, stateVars.length);
              var stateValue = this.stateValues[stateVarIndex];
              var compareValue = choice([
                stateValue,
                getRandomInteger(-250, 250),
              ]);

              var operator: t.BinaryExpression["operator"] = choice([
                "==",
                "!=",
                "<",
                ">",
              ]);
              var compareResult;
              switch (operator) {
                case "==":
                  compareResult = stateValue === compareValue;
                  break;
                case "!=":
                  compareResult = stateValue !== compareValue;
                  break;
                case "<":
                  compareResult = stateValue < compareValue;
                  break;
                case ">":
                  compareResult = stateValue > compareValue;
                  break;
              }

              return {
                node: t.binaryExpression(
                  operator,
                  deepClone(stateVars[stateVarIndex]),
                  numericLiteral(compareValue)
                ),
                value: compareResult,
              };
            }

            identifier(
              identifierName: string,
              scopeManager = this.scopeManager
            ) {
              if (
                this.withDiscriminant &&
                this.withDiscriminant === scopeManager
              ) {
                var id = t.identifier(identifierName);
                (id as NodeSymbol)[NO_RENAME] = identifierName;
                me.skip(id);
                return id;
              }

              return scopeManager.getMemberExpression(identifierName);
            }

            initializedScope: ScopeManager;

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
                  new ScopeManager(this.scope, this)
                );
              }

              this.initializedScope = this.scopeManager;
            }
          }

          const switchLabel = me.getPlaceholder();
          const breakStatement = () => {
            return t.breakStatement(t.identifier(switchLabel));
          };

          const startLabel = me.getPlaceholder();
          const endLabel = me.getPlaceholder();

          let currentBasicBlock = new BasicBlock(startLabel, blockPath);
          currentBasicBlock.allowWithDiscriminant = false;

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
                  !flattenFunctionDeclarations ||
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
                scopeToScopeManager.get(statement.scope).requiresInitializing =
                  false;
                basicBlocks.get(fnLabel).allowWithDiscriminant = false;

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
                        deepClone(argVar)
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
                  currentBasicBlock.initializedScope =
                    oldBasicBlock.scopeManager;

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

          basicBlocks.get(endLabel).allowWithDiscriminant = false;

          // Add with / reset with logic
          basicBlocks.get(startLabel).body.unshift(
            new Template(`
              ${scopeVar.name}["${resetWithProperty}"] = function(newStateValues){
                ${scopeVar.name}["${withProperty}"] = undefined;
                {arrayPattern} = newStateValues
              }
              `).single({
              arrayPattern: t.arrayPattern(deepClone(stateVars)),
            })
          );

          if (!isDebug && addDeadCode) {
            // DEAD CODE 1/3: Add fake chunks that are never reached
            const fakeChunkCount = getRandomInteger(1, 5);
            for (let i = 0; i < fakeChunkCount; i++) {
              // These chunks just jump somewhere random, they are never executed
              // so it could contain any code
              const fakeBlock = new BasicBlock(me.getPlaceholder(), blockPath);
              let fakeJump;
              do {
                fakeJump = choice(Array.from(basicBlocks.keys()));
              } while (fakeJump === fakeBlock.label);

              fakeBlock.insertAfter(GotoControlStatement(fakeJump));
            }

            // DEAD CODE 2/3: Add fake jumps to really mess with deobfuscators
            // "irreducible control flow"
            basicBlocks.forEach((basicBlock) => {
              if (chance(25)) {
                var randomLabel = choice(Array.from(basicBlocks.keys()));

                // The `false` literal will be mangled
                basicBlock.insertAfter(
                  new Template(`
                    if({predicate}){
                      {goto}
                    }
                    `).single({
                    goto: GotoControlStatement(randomLabel),
                    predicate: basicBlock.createFalsePredicate(),
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

                randomChunk.thisNode.body
                  .map((x) => deepClone(x))
                  .forEach((node) => {
                    if (node.type === "EmptyStatement") return;
                    clonedChunk.insertAfter(node);
                  });
              }
            }
          }

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
                    deepClone(stateVar),
                    numericLiteral(compareValue)
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
                    deepClone(stateVar),
                    me.skip(numericLiteral(num - currentStateValues[index]))
                  );

                  ensureComputedExpression(numPath);

                  numPath.replaceWith(diff);
                  numPath.skip();
                },
              },

              Identifier: {
                exit(path: NodePath<t.Identifier>) {
                  if (!isVariableIdentifier(path)) return;
                  if (me.isSkipped(path)) return;

                  const identifierName = path.node.name;
                  if (identifierName === gotoFunctionName) return;

                  var binding = basicBlock.scope.getBinding(identifierName);
                  if (!binding) {
                    return;
                  }

                  if (
                    binding.kind === "var" ||
                    binding.kind === "let" ||
                    binding.kind === "const"
                  ) {
                  } else {
                    return;
                  }

                  // console.log("No binding found for " + identifierName);

                  var scopeManager = scopeToScopeManager.get(binding.scope);
                  if (!scopeManager) return;
                  if (scopeManager.preserveNames.has(identifierName)) return;

                  let newName = scopeManager.getNewName(
                    identifierName,
                    path.node
                  );

                  let memberExpression: t.MemberExpression | t.Identifier =
                    scopeManager.getMemberExpression(newName);

                  scopeManager.isNotUsed = false;

                  if (path.isBindingIdentifier()) {
                    if (
                      path.key === "id" &&
                      path.parentPath.isFunctionDeclaration()
                    ) {
                      var asFunctionExpression = deepClone(
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
                      var asClassExpression = deepClone(
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
                      var variableDeclaration = path.find(
                        (p) =>
                          p.isVariableDeclaration() ||
                          p === basicBlock.parentPath
                      ) as NodePath<t.VariableDeclaration>;

                      if (
                        variableDeclaration &&
                        variableDeclaration.isVariableDeclaration()
                      ) {
                        ok(variableDeclaration.node.declarations.length === 1);

                        const first =
                          variableDeclaration.get("declarations")[0];
                        const id = first.get("id");

                        const init = first.get("init");

                        var newExpression: t.Node = id.node;

                        var isForInitializer =
                          (variableDeclaration.key === "init" ||
                            variableDeclaration.key === "left") &&
                          variableDeclaration.parentPath.isFor();

                        if (init.node || !isForInitializer) {
                          newExpression = t.assignmentExpression(
                            "=",
                            id.node,
                            init.node || t.identifier("undefined")
                          );
                        }

                        if (!isForInitializer) {
                          newExpression = t.expressionStatement(
                            newExpression as t.Expression
                          );
                        }

                        variableDeclaration.replaceWith(newExpression);
                        path.replaceWith(memberExpression);

                        return;
                      } else {
                        //ok(false, "Binding not found");
                      }
                    }
                  }

                  if (isDefiningIdentifier(path)) {
                    return;
                  }
                  if (!path.container) return;

                  var assignmentLeft = path.find(
                    (p) =>
                      (p.key === "left" &&
                        p.parentPath?.isAssignmentExpression()) ||
                      p === basicBlock.parentPath
                  );
                  if (
                    assignmentLeft &&
                    !assignmentLeft.parentPath?.isAssignmentExpression()
                  ) {
                    assignmentLeft = null;
                  }

                  if (
                    basicBlock.withDiscriminant &&
                    basicBlock.withDiscriminant === scopeManager &&
                    basicBlock.withDiscriminant.hasName(identifierName)
                  ) {
                    // console.log(identifierName, !!assignmentLeft);
                    if (assignmentLeft) {
                      // memberExpression = new Template(`
                      // typeof {identifierName} !== "undefined" ? {identifierName} : {memberExpression}
                      // `).expression({
                      //   memberExpression: memberExpression,
                      //   identifierName: () => {
                      //     var id = t.identifier(newName);
                      //     (id as NodeSymbol)[NO_RENAME] = newName;
                      //     me.skip(id);
                      //     return id;
                      //   },
                      // });
                    } else {
                      memberExpression = basicBlock.identifier(
                        newName,
                        scopeManager
                      );
                    }
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
                ({didReturnVar} = true, {returnArgument})
                  `).expression({
                    returnArgument,
                    didReturnVar: deepClone(didReturnVar),
                  });
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

                    const assignments: t.Expression[] = [];
                    let needsIndividualAssignments = true;

                    if (jumpBlock.withDiscriminant) {
                      assignments.push(
                        t.assignmentExpression(
                          "=",
                          deepClone(withDiscriminant),
                          jumpBlock.withDiscriminant.getScopeObject()
                        )
                      );
                    } else if (basicBlock.withDiscriminant) {
                      assignments.push(
                        t.callExpression(
                          t.memberExpression(
                            deepClone(scopeVar),
                            t.stringLiteral(resetWithProperty),
                            true
                          ),
                          [
                            t.arrayExpression(
                              newStateValues.map(numericLiteral)
                            ),
                          ]
                        )
                      );
                      needsIndividualAssignments = false;
                    }

                    if (needsIndividualAssignments) {
                      for (let i = 0; i < stateVars.length; i++) {
                        const oldValue = currentStateValues[i];
                        const newValue = newStateValues[i];

                        // console.log(oldValue, newValue);
                        if (oldValue === newValue) continue; // No diff needed if the value doesn't change

                        const leftValue = jumpBlock.withDiscriminant
                          ? jumpBlock.withDiscriminant.getMemberExpression(
                              stateVars[i].name
                            )
                          : deepClone(stateVars[i]);

                        let assignment = t.assignmentExpression(
                          "=",
                          leftValue,
                          numericLiteral(newValue)
                        );

                        if (!isDebug && addRelativeAssignments) {
                          // Use diffs to create confusing code
                          assignment = t.assignmentExpression(
                            "+=",
                            deepClone(stateVars[i]),
                            numericLiteral(newValue - oldValue)
                          );
                        }

                        assignments.push(assignment);
                      }
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

          // Select scope managers for the with statement
          for (const basicBlock of basicBlocks.values()) {
            basicBlock.bestWithDiscriminant =
              basicBlock.initializedScope?.findUsed();

            if (isDebug && basicBlock.withDiscriminant) {
              basicBlock.body.unshift(
                t.expressionStatement(
                  t.stringLiteral(
                    "With " + basicBlock.withDiscriminant.propertyName
                  )
                )
              );
            }
          }

          // Add scope initializations: scope["_0"] = {identity: "_0"}
          for (const scopeManager of scopeToScopeManager.values()) {
            if (scopeManager.isNotUsed) continue;
            if (!scopeManager.requiresInitializing) continue;
            if (scopeManager.initializingBasicBlock.label === startLabel)
              continue;

            scopeManager.initializingBasicBlock.body.unshift(
              scopeManager.getInitializingStatement()
            );
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

            let test: t.Expression = numericLiteral(block.totalState);

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
                        stateVars[differentIndex].name +
                        "!=" +
                        labelStates[differentIndex];
                      if (!alreadyConditionedItems.has(expressionAsString)) {
                        alreadyConditionedItems.add(expressionAsString);

                        conditionNodes.push(
                          t.binaryExpression(
                            "!=",
                            deepClone(stateVars[differentIndex]),
                            numericLiteral(labelStates[differentIndex])
                          )
                        );
                      }
                    } else {
                      conditionNodes.push(
                        t.binaryExpression(
                          "!=",
                          deepClone(discriminant),
                          numericLiteral(totalState)
                        )
                      );
                    }
                  }
                }
              });

              // case STATE!=Y && STATE+X
              test = t.binaryExpression(
                "-",
                deepClone(stateVars[stateVarIndex]),
                numericLiteral(difference)
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
                tests.push(numericLiteral(stateIntGen.generate()));
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
            ${stateVars.map((x) => x.name).join(" + ")}
          `).expression<t.Expression>();

          traverse(t.program([t.expressionStatement(discriminant)]), {
            Identifier(path) {
              (path.node as NodeSymbol)[NO_RENAME] = path.node.name;
            },
          });

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
              deepClone(discriminant),
              numericLiteral(endTotalState)
            ),
            t.blockStatement([
              t.withStatement(
                new Template(
                  `{withDiscriminant} || Object["create"](null)`
                ).expression({
                  withDiscriminant,
                }),
                t.blockStatement([switchStatement])
              ),
            ])
          );

          var parameters: t.Identifier[] = [...stateVars, argVar, scopeVar].map(
            (id) => deepClone(id)
          );

          var parametersNames: string[] = parameters.map((id) => id.name);

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
              const stateIndex = stateVars
                .map((x) => x.name)
                .indexOf(parameterName);
              if (stateIndex !== -1) {
                argumentsNodes.push(numericLiteral(stateValues[stateIndex]));
              } else if (parameterName === argVar.name) {
                argumentsNodes.push(t.identifier(argumentsRestName));
              } else if (parameterName === scopeVar.name) {
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
                  deepClone(mainFnName),
                  argumentsNodes
                ),
              })
            );
          }

          const mainFnDeclaration = t.functionDeclaration(
            deepClone(mainFnName),
            parameters,
            t.blockStatement([whileStatement])
          );

          (mainFnDeclaration as NodeSymbol)[PREDICTABLE] = true;

          var startProgramExpression = t.callExpression(deepClone(mainFnName), [
            ...startStateValues.map((stateValue) => numericLiteral(stateValue)),
            t.identifier("undefined"),
            basicBlocks
              .get(startLabel)
              .scopeManager.getObjectExpression(startLabel),
          ]);

          var resultVar = withIdentifier("result");
          var allowReturns = blockPath.find((p) => p.isFunction());

          const startProgramStatements = new Template(`
            ${allowReturns ? `var {didReturnVar};` : ""}
            var {resultVar} = {startProgramExpression};
            ${
              allowReturns
                ? `
            if({didReturnVar}){
              return {resultVar};
            }`
                : ""
            }
          `).compile({
            startProgramExpression,
            didReturnVar: () => deepClone(didReturnVar),
            resultVar: () => deepClone(resultVar),
          });

          blockPath.node.body = [
            ...prependNodes,
            mainFnDeclaration,
            ...startProgramStatements,
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
