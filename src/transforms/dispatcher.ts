import { ComputeProbabilityMap } from "../index";
import { walk } from "../traverse";
import {
  ArrayExpression,
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  IfStatement,
  Literal,
  Node,
  Location,
  MemberExpression,
  ObjectExpression,
  Property,
  ReturnStatement,
  VariableDeclaration,
  SequenceExpression,
  NewExpression,
  UnaryExpression,
  BlockStatement,
  LogicalExpression,
  ThisExpression,
  VariableDeclarator,
} from "../util/gen";
import { getIdentifierInfo, isWithinClass } from "../util/identifiers";
import {
  deleteDirect,
  getBlockBody,
  getContext,
  getFunction,
  isContext,
  isFunction,
  prepend,
} from "../util/insert";
import Transform, { reservedIdentifiers } from "./transform";
import { isInsideType } from "../util/compare";
import { ObfuscateOrder } from "../obfuscator";
import { choice, shuffle } from "../util/random";

/**
 * A Dispatcher processes function calls. All the function declarations are brought into a dictionary.
 *
 * We can use an argument payload to further decipher the trace.
 *
 * ```js
 * var param1;
 * function dispatcher(key){
 *     var fns = {
 *         'fn1': function(){
 *             var [arg1] = [param1];
 *             console.log(arg1);
 *         }
 *     }
 *     return fns[key]();
 * };
 * param1 = "Hello World";
 * dispatcher('fn1'); // > "Hello World"
 * ```
 *
 * Can break code with:
 *
 * 1. testing function equality,
 * 2. using arguments.callee,
 * 3. using this
 */
export default class Dispatcher extends Transform {
  count: number;

  constructor(o) {
    super(o, ObfuscateOrder.Dispatcher);

    this.count = 0;
  }

  match(object: Node, parents: Node[]) {
    if (isInsideType("AwaitExpression", object, parents)) {
      return false;
    }

    return isContext(object) && !object.$dispatcherSkip;
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (ComputeProbabilityMap(this.options.dispatcher, (mode) => mode)) {
        if (object.type != "Program" && object.body.type != "BlockStatement") {
          return;
        }

        var body = getBlockBody(object.body);

        // Controls how many arg variables to make
        var maxArgs = 0;

        // Map of FunctionDeclarations
        var functionDeclarations: { [name: string]: Location } = {};

        // Array of Identifier nodes
        var identifiers: Location[] = [];
        var illegalFnNames: Set<string> = new Set();

        // New Names for Functions
        var newFnNames: { [name: string]: string } = {}; // [old name]: randomized name

        var context = getContext(object, parents);

        walk(object, parents, (o: Node, p: Node[]) => {
          if (object == o) {
            // Fix 1
            return;
          }
          if (isWithinClass(o, p)) {
            return;
          }

          var c = getContext(o, p);

          if (context === c) {
            if (o.type == "FunctionDeclaration") {
              if (o.body.type != "BlockStatement") {
                illegalFnNames.add(name);
              }

              var name = o.id.name;

              // If dupe, no routing
              if (functionDeclarations[name] || o.$integritySkip) {
                illegalFnNames.add(name);
                return;
              }

              walk(o, p, (oo, pp) => {
                if (oo.type == "Identifier" && oo.name == "arguments") {
                  illegalFnNames.add(name);
                } else if (oo.type == "ThisExpression") {
                  illegalFnNames.add(name);
                }
              });

              functionDeclarations[name] = [o, p];
            }
          }

          if (o.type == "Identifier") {
            if (reservedIdentifiers.has(o.name)) {
              return;
            }
            var info = getIdentifierInfo(o, p);
            if (info.spec.isModified) {
              illegalFnNames.add(o.name);
            } else if (info.spec.isReferenced) {
              identifiers.push([o, p]);
            }
          }
        });

        illegalFnNames.forEach((name) => {
          delete functionDeclarations[name];
        });

        Object.keys(functionDeclarations).forEach((x) => {
          maxArgs = Math.max(functionDeclarations[x][0].params.length, maxArgs);
        });

        // map original name->new game
        var gen = this.getGenerator();
        Object.keys(functionDeclarations).forEach((name) => {
          newFnNames[name] = gen.generate();
        });
        // set containing new name
        var set = new Set(Object.keys(newFnNames));

        // Only make a dispatcher function if it caught any functions
        if (set.size > 0) {
          var varArgs = Array(maxArgs)
            .fill(0)
            .map((x, i) => `$jsc_d${this.count}_${i}`);
          var dispatcherFnName =
            this.getPlaceholder() + "_dispatcher_" + this.count;

          this.log(dispatcherFnName, set);
          this.count++;

          var expectedGet = gen.generate();
          var expectedClearArgs = gen.generate();
          var expectedNew = gen.generate();

          var returnProp = gen.generate();
          var newReturnMemberName = gen.generate();

          var shuffledKeys = shuffle(Object.keys(functionDeclarations));
          var mapName = this.getPlaceholder();

          // creating the dispatcher function
          // 1. create function map
          var map = VariableDeclaration(
            VariableDeclarator(
              mapName,
              ObjectExpression(
                shuffledKeys.map((name) => {
                  var [def, defParents] = functionDeclarations[name];
                  var body = getBlockBody(def.body);

                  var functionExpression: Node = {
                    ...def,
                    expression: false,
                    type: "FunctionExpression",
                    id: null,
                  };

                  if (def.params.length > 0) {
                    const fixParam = (param: Node) => {
                      this.addComment(param, "Unloader(param): " + param.name);

                      return param;
                    };

                    var variableDeclaration = VariableDeclaration(
                      VariableDeclarator(
                        {
                          type: "ArrayPattern",
                          elements: def.params.map(fixParam),
                        },
                        ArrayExpression(
                          varArgs
                            .slice(0, def.params.length)
                            .map(Identifier as any)
                        )
                      )
                    );

                    prepend(def.body, variableDeclaration);

                    // replace params with random identifiers
                    var args = [0, 1, 2].map((x) => this.getPlaceholder());
                    functionExpression.params = args.map((x) => Identifier(x));

                    var deadCode = choice(["fakeReturn", "ifStatement"]);

                    switch (deadCode) {
                      case "fakeReturn":
                        // Dead code...
                        var ifStatement = IfStatement(
                          UnaryExpression("!", Identifier(args[0])),
                          [
                            ReturnStatement(
                              CallExpression(Identifier(args[1]), [
                                ThisExpression(),
                                Identifier(args[2]),
                              ])
                            ),
                          ],
                          null
                        );

                        body.unshift(ifStatement);
                        break;

                      case "ifStatement":
                        var test = LogicalExpression(
                          "||",
                          Identifier(args[0]),
                          AssignmentExpression(
                            "=",
                            Identifier(args[1]),
                            CallExpression(Identifier(args[2]), [])
                          )
                        );
                        def.body = BlockStatement([
                          IfStatement(test, [...body], null),
                          ReturnStatement(Identifier(args[1])),
                        ]);
                        break;
                    }
                  }

                  // For logging purposes
                  var signature =
                    name +
                    "(" +
                    def.params.map((x) => x.name || "<>").join(",") +
                    ")";
                  this.log("Added", signature);

                  // delete ref in block
                  if (defParents.length) {
                    deleteDirect(def, defParents[0]);
                  }

                  this.addComment(functionExpression, signature);
                  return Property(
                    Literal(newFnNames[name]),
                    functionExpression,
                    false
                  );
                })
              )
            )
          );

          var getterArgNames = varArgs.map((x) => this.getPlaceholder());

          var x = this.getPlaceholder();
          var y = this.getPlaceholder();
          var z = this.getPlaceholder();

          function getAccessor() {
            return MemberExpression(Identifier(mapName), Identifier(x), true);
          }

          // 2. define it
          var fn = FunctionDeclaration(
            dispatcherFnName,
            [Identifier(x), Identifier(y), Identifier(z)],
            [
              // Define map of callable functions
              map,

              // Set returning variable to undefined
              VariableDeclaration(VariableDeclarator(returnProp)),

              // Check for getter flag
              varArgs.length
                ? IfStatement(
                    BinaryExpression(
                      "==",
                      Identifier(y),
                      Literal(expectedClearArgs)
                    ),
                    [
                      ExpressionStatement(
                        SequenceExpression(
                          varArgs.map((x) =>
                            AssignmentExpression(
                              "=",
                              Identifier(x),
                              Identifier("undefined")
                            )
                          )
                        )
                      ),
                    ],
                    null
                  )
                : // Fake code
                  IfStatement(
                    BinaryExpression(
                      "==",
                      Identifier(y),
                      Literal(gen.generate())
                    ),
                    [ReturnStatement(Identifier(z))],
                    null
                  ),
              IfStatement(
                BinaryExpression("==", Identifier(y), Literal(expectedGet)),
                [
                  // Getter flag: return the function object
                  ExpressionStatement(
                    AssignmentExpression(
                      "=",
                      Identifier(returnProp),
                      FunctionExpression(
                        getterArgNames.map(Identifier as any),
                        [
                          // Arg setter
                          ...getterArgNames.map((x, i) =>
                            ExpressionStatement(
                              AssignmentExpression(
                                "=",
                                Identifier(varArgs[i]),
                                Identifier(x)
                              )
                            )
                          ),

                          // Call fn & return
                          ReturnStatement(
                            CallExpression(
                              MemberExpression(
                                getAccessor(),
                                Identifier("call"),
                                false
                              ),
                              [ThisExpression(), Literal(gen.generate())]
                            )
                          ),
                        ]
                      )
                    )
                  ),
                ],
                [
                  // Call the function, return result
                  ExpressionStatement(
                    AssignmentExpression(
                      "=",
                      Identifier(returnProp),
                      CallExpression(getAccessor(), [Literal(gen.generate())])
                    )
                  ),
                ]
              ),

              // Check how the function was invoked (new () vs ())
              IfStatement(
                BinaryExpression("==", Identifier(z), Literal(expectedNew)),
                [
                  // Wrap in object
                  ReturnStatement(
                    ObjectExpression([
                      Property(
                        Identifier(newReturnMemberName),
                        Identifier(returnProp),
                        false
                      ),
                    ])
                  ),
                ],
                [
                  // Return raw result
                  ReturnStatement(Identifier(returnProp)),
                ]
              ),
            ]
          );

          prepend(object, fn);

          if (varArgs.length) {
            prepend(
              object,
              VariableDeclaration(varArgs.map((x) => VariableDeclarator(x)))
            );
          }

          identifiers.forEach(([o, p]) => {
            if (o.type != "Identifier") {
              return;
            }

            var newName = newFnNames[o.name];
            if (!newName) {
              return;
            }

            if (!functionDeclarations[o.name]) {
              this.error(new Error("newName, missing function declaration"));
            }

            var info = getIdentifierInfo(o, p);
            if (info.isFunctionCall && p[0].type == "CallExpression") {
              // Invoking call expression: `a();`

              if (o.name == dispatcherFnName) {
                return;
              }

              this.log(
                `${o.name}(${p[0].arguments
                  .map((_) => "<>")
                  .join(",")}) -> ${dispatcherFnName}('${newName}')`
              );

              var assignmentExpressions: Node[] = [];
              var dispatcherArgs: Node[] = [Literal(newName)];

              if (p[0].arguments.length) {
                varArgs.forEach((vName, i) => {
                  if (functionDeclarations[o.name][0].params.length > i) {
                    assignmentExpressions.push(
                      AssignmentExpression(
                        "=",
                        Identifier(vName),
                        p[0].arguments[i] || Identifier("undefined")
                      )
                    );
                  }
                });
              } else {
                dispatcherArgs.push(Literal(expectedClearArgs));
              }

              var type = choice(["CallExpression", "NewExpression"]);
              var callExpression = null;

              switch (type) {
                case "CallExpression":
                  callExpression = CallExpression(
                    Identifier(dispatcherFnName),
                    dispatcherArgs
                  );
                  break;

                case "NewExpression":
                  if (dispatcherArgs.length == 1) {
                    dispatcherArgs.push(Identifier("undefined"));
                  }
                  callExpression = MemberExpression(
                    NewExpression(Identifier(dispatcherFnName), [
                      ...dispatcherArgs,
                      Literal(expectedNew),
                    ]),
                    Identifier(newReturnMemberName),
                    false
                  );
                  break;
              }

              this.addComment(
                callExpression,
                "Calling " +
                  o.name +
                  "(" +
                  p[0].arguments.map((x) => x.name).join(", ") +
                  ")"
              );

              var expr: Node = assignmentExpressions.length
                ? SequenceExpression([...assignmentExpressions, callExpression])
                : callExpression;

              // Replace the parent call expression
              this.replace(p[0], expr);
            } else {
              // Non-invoking reference: `a`

              if (info.spec.isDefined) {
                if (info.isFunctionDeclaration) {
                  this.log(
                    "Skipped getter " + o.name + " (function declaration)"
                  );
                } else {
                  this.log("Skipped getter " + o.name + " (defined)");
                }
                return;
              }
              if (info.spec.isModified) {
                this.log("Skipped getter " + o.name + " (modified)");
                return;
              }

              this.log(
                `(getter) ${o.name} -> ${dispatcherFnName}('${newName}')`
              );
              this.replace(
                o,
                CallExpression(Identifier(dispatcherFnName), [
                  Literal(newName),
                  Literal(expectedGet),
                ])
              );
            }
          });
        }
      }
    };
  }
}
