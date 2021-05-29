import Transform from "../transform";
import {
  Node,
  IfStatement,
  ExpressionStatement,
  AssignmentExpression,
  Identifier,
  BinaryExpression,
  CallExpression,
  MemberExpression,
  Literal,
  UnaryExpression,
  NewExpression,
  FunctionDeclaration,
  ReturnStatement,
  VariableDeclaration,
  ObjectExpression,
  Property,
  ArrayExpression,
  FunctionExpression,
  ThisExpression,
  SequenceExpression,
  VariableDeclarator,
  Location,
} from "../../util/gen";
import traverse, { getBlock, isBlock, walk } from "../../traverse";
import { ok } from "assert";
import { choice, getRandomInteger, shuffle } from "../../util/random";
import {
  CrashTemplate1,
  CrashTemplate2,
  CrashTemplate3,
} from "../../templates/crash";
import { getBlockBody, getVarContext, prepend } from "../../util/insert";
import Template from "../../templates/template";
import { ObfuscateOrder } from "../../order";
import Integrity from "./integrity";
import { isLoop } from "../preparation/preparation";
import AntiDebug from "./antiDebug";
import { getIdentifierInfo } from "../../util/identifiers";
import { isValidIdentifier } from "../../util/compare";

/**
 * Strings are formulated to work only during the allowed time
 */
class LockStrings extends Transform {
  strings: { [key: string]: string };
  gen: any;
  fnName: string;
  objectExpression: Node;
  shift: number;

  constructor(o) {
    super(o);

    this.strings = Object.create(null);
    this.gen = this.getGenerator();

    this.fnName = null;
    this.objectExpression = null;

    this.shift = getRandomInteger(1, 5);
  }

  match(object) {
    return (
      object.type == "Program" ||
      (object.type == "Literal" && typeof object.value === "string")
    );
  }

  getKey() {
    function ensureNumber(y: Date | number | false) {
      if (!y) {
        return 0;
      }
      if (y instanceof Date) {
        return y.getTime();
      }

      // @ts-ignore
      return parseInt(y);
    }

    var start = ensureNumber(this.options.lock.startDate);
    var end = ensureNumber(this.options.lock.endDate);

    var diff = end - start;

    var now = Date.now();

    return {
      key: Math.floor(now / diff),
      diff: diff,
    };
  }

  transform(object: Node, parents: Node[]) {
    if (!this.fnName) {
      this.fnName = this.getPlaceholder();

      this.objectExpression = ObjectExpression([]);
    }

    if (object.type == "Program") {
      var keyArg = this.getPlaceholder();
      var mapName = this.getPlaceholder();

      return () => {
        if (this.objectExpression.properties.length) {
          var keyVar = this.getPlaceholder();

          var { diff } = this.getKey();
          prepend(
            object,
            VariableDeclaration([
              VariableDeclarator(
                Identifier(keyVar),
                Template(`Math.floor(Date.now()/${diff})`).single().expression
              ),
            ])
          );

          var currentVar = this.getPlaceholder();
          var outputVar = this.getPlaceholder();
          var xVar = this.getPlaceholder();

          prepend(
            object,
            FunctionDeclaration(
              this.fnName,
              [Identifier(keyArg)],
              [
                VariableDeclaration(
                  VariableDeclarator(mapName, this.objectExpression)
                ),
                VariableDeclaration(
                  VariableDeclarator(
                    currentVar,
                    MemberExpression(
                      Identifier(mapName),
                      Identifier(keyArg),
                      true
                    )
                  )
                ),
                VariableDeclaration(VariableDeclarator(outputVar, Literal(""))),
                ExpressionStatement(
                  CallExpression(
                    MemberExpression(
                      Identifier(currentVar),
                      Identifier("forEach"),
                      false
                    ),
                    [
                      FunctionExpression(
                        [Identifier(xVar)],
                        [
                          ExpressionStatement(
                            AssignmentExpression(
                              "+=",
                              Identifier(outputVar),
                              CallExpression(
                                MemberExpression(
                                  Identifier("String"),
                                  Identifier("fromCharCode"),
                                  false
                                ),
                                [
                                  BinaryExpression(
                                    "^",
                                    BinaryExpression(
                                      ">>",
                                      Identifier(xVar),
                                      Literal(this.shift)
                                    ),
                                    Identifier(keyVar)
                                  ),
                                ]
                              )
                            )
                          ),
                        ]
                      ),
                    ]
                  )
                ),
                ReturnStatement(Identifier(outputVar)),
              ]
            )
          );
        }
      };
    }

    if (!object.value) {
      return;
    }

    if (
      parents.find(
        (x) => x.type == "CallExpression" && x.callee.name == this.fnName
      )
    ) {
      return;
    }

    var key = this.strings[object.value];

    if (!key) {
      // New string found!
      key = this.gen.generate();
      this.strings[key] = object.value;

      var xorKey = this.getKey().key;

      var array = ArrayExpression(
        object.value
          .split("")
          .map((x) => x.charCodeAt(0))
          .map((x) => x ^ xorKey)
          .map((x) => x << this.shift)
          .map((x) => Literal(x))
      );

      this.objectExpression.properties.push(
        Property(Identifier(key), array, false)
      );
    }

    if (parents[0].type == "Property") {
      parents[0].computed = true;
    }

    this.objectAssign(
      object,
      CallExpression(Identifier(this.fnName), [Literal(key)])
    );
  }
}

/**
 * Applies browser & date locks.
 */
export default class Lock extends Transform {
  globalVar: string;
  counterMeasuresNode: Location;

  constructor(o) {
    super(o, ObfuscateOrder.Lock);

    if (this.options.lock.startDate && this.options.lock.endDate) {
      this.before.push(new LockStrings(o));
    }

    if (this.options.lock.integrity) {
      this.before.push(new Integrity(o, this));
    }

    if (this.options.lock.antiDebug) {
      this.before.push(new AntiDebug(o));
    }
  }

  apply(tree) {
    if (
      typeof this.options.lock.countermeasures === "string" &&
      isValidIdentifier(this.options.lock.countermeasures)
    ) {
      var defined = new Set<string>();
      traverse(tree, (object, parents) => {
        if (object.type == "Identifier") {
          var info = getIdentifierInfo(object, parents);
          if (info.spec.isDefined) {
            defined.add(object.name);
            if (object.name === this.options.lock.countermeasures) {
              if (this.counterMeasuresNode) {
                throw new Error(
                  "Countermeasures function was already defined, it must have a unique name from the rest of your code"
                );
              } else {
                var definingContext = getVarContext(
                  parents[0],
                  parents.slice(1)
                );
                if (definingContext != tree) {
                  throw new Error(
                    "Countermeasures function must be defined at the global level"
                  );
                }
                var chain: Location = [object, parents];
                if (info.isFunctionDeclaration) {
                  chain = [parents[0], parents.slice(1)];
                } else if (info.isVariableDeclaration) {
                  chain = [parents[1], parents.slice(2)];
                }

                this.counterMeasuresNode = chain;
              }
            }
          }
        }
      });

      if (!this.counterMeasuresNode) {
        throw new Error(
          "Countermeasures function named '" +
            this.options.lock.countermeasures +
            "' was not found. Names found: " +
            Array.from(defined).slice(0, 100).join(", ")
        );
      }
    }

    super.apply(tree);
  }

  getCounterMeasuresCode(): Node[] {
    var opt = this.options.lock.countermeasures;

    if (opt === false) {
      return null;
    }

    // Call function
    if (typeof opt === "string") {
      // Since Lock occurs before variable renaming, we are using the pre-obfuscated function name
      return [CallExpression(Template(opt).single().expression, [])];
    }

    var type = choice(["crash", "exit", "stutter"]);

    switch (type) {
      case "crash":
        var varName = this.getPlaceholder();
        return choice([CrashTemplate1, CrashTemplate2, CrashTemplate3]).compile(
          {
            var: varName,
          }
        );

      case "exit":
        if (this.options.target == "browser") {
          return Template("document.documentElement.innerHTML = '';").compile();
        }

        return Template("process.exit()").compile();

      case "stutter":
        return Template(
          "for ( var i=0; i < 1000; i++ ) { var x = Math.cos(i) }"
        ).compile();

      case "sideeffect": // A Side effect involves disrupting the programs flow
        return;
    }
  }

  /**
   * Converts Dates to numbers, then applies some randomness
   * @param object
   */
  getTime(object: Date | number | false): number {
    if (!object) {
      return 0;
    }
    if (object instanceof Date) {
      return this.getTime(object.getTime());
    }

    return object + getRandomInteger(-4000, 4000);
  }

  match(object: Node, parents: Node[]) {
    return isBlock(object);
  }

  transform(object: Node, parents: Node[]) {
    if (parents.find((x) => isLoop(x) && x.type != "SwitchStatement")) {
      return;
    }

    // no check in countermeasures code, otherwise it will infinitely call itself
    if (
      this.counterMeasuresNode &&
      (object == this.counterMeasuresNode[0] ||
        parents.indexOf(this.counterMeasuresNode[0]) !== -1)
    ) {
      return;
    }

    var block = getBlock(object, parents);

    var choices = [];
    if (this.options.lock.startDate) {
      choices.push("startDate");
    }
    if (this.options.lock.endDate) {
      choices.push("endDate");
    }
    if (this.options.lock.domainLock && this.options.lock.domainLock.length) {
      choices.push("domainLock");
    }
    if (this.options.lock.nativeFunctions) {
      choices.push("nativeFunction");
    }
    if (this.options.lock.context) {
      choices.push("context");
    }
    if (!choices.length) {
      return;
    }

    return () => {
      var type = choice(choices);
      var nodes = [];

      var dateNow: Node = CallExpression(
        MemberExpression(Identifier("Date"), Literal("now"), true),
        []
      );
      if (Math.random() > 0.5) {
        dateNow = CallExpression(
          MemberExpression(
            NewExpression(Identifier("Date"), []),
            Literal("getTime")
          ),
          []
        );
      }
      if (Math.random() > 0.5) {
        dateNow = CallExpression(
          MemberExpression(
            MemberExpression(
              MemberExpression(Identifier("Date"), Literal("prototype"), true),
              Literal("getTime"),
              true
            ),
            Literal("call"),
            true
          ),
          [NewExpression(Identifier("Date"), [])]
        );
      }

      var test;

      switch (type) {
        case "nativeFunction":
          var set = this.options.lock.nativeFunctions;
          if (set === true) {
            set = new Set(["require"]);
          }
          if (Array.isArray(set)) {
            set = new Set(set);
          }
          if (!set) {
            set = new Set();
          }

          var fn = choice(Array.from(set));
          if (fn) {
            test = Template(
              `(${fn}+"").indexOf("[native code]") == -1`
            ).single().expression;

            if (Math.random() > 0.5) {
              test = Template(
                `${fn}.toString().split("{ [native code] }").length <= 1`
              ).single().expression;
            }

            nodes.push(
              IfStatement(test, this.getCounterMeasuresCode() || [], null)
            );
          }

          break;

        case "startDate":
          test = BinaryExpression(
            "<",
            dateNow,
            Literal(this.getTime(this.options.lock.startDate))
          );

          nodes.push(
            IfStatement(test, this.getCounterMeasuresCode() || [], null)
          );

          break;

        case "endDate":
          test = BinaryExpression(
            ">",
            dateNow,
            Literal(this.getTime(this.options.lock.endDate))
          );

          nodes.push(
            IfStatement(test, this.getCounterMeasuresCode() || [], null)
          );

          break;

        case "context":
          var prop = choice(this.options.lock.context);

          // Todo: Alternative to `this`
          if (!this.globalVar) {
            this.globalVar = this.getPlaceholder();
            prepend(
              parents[parents.length - 1] || block,
              VariableDeclaration(
                VariableDeclarator(this.globalVar, ThisExpression())
              )
            );
          }

          test = UnaryExpression(
            "!",
            MemberExpression(Identifier(this.globalVar), Literal(prop), true)
          );
          nodes.push(
            IfStatement(test, this.getCounterMeasuresCode() || [], null)
          );

          break;

        case "domainLock":
          function removeSlashes(path: string) {
            var count = path.length - 1;
            var index = 0;

            while (path.charCodeAt(index) === 47 && ++index);
            while (path.charCodeAt(count) === 47 && --count);

            return path.slice(index, count + 1);
          }

          var locationHref = MemberExpression(
            Identifier("location"),
            Literal("href"),
            true
          );

          var random = choice(this.options.lock.domainLock as any);
          if (random) {
            test = CallExpression(
              MemberExpression(locationHref, Literal("match"), true),
              [
                {
                  type: "Literal",
                  regex: {
                    pattern:
                      random instanceof RegExp
                        ? random.source
                        : removeSlashes(random + ""),
                    flags: random instanceof RegExp ? "" : "",
                  },
                },
              ]
            );

            test = UnaryExpression("!", test);
            if (Math.random() > 0.5) {
              test = BinaryExpression(
                "||",
                BinaryExpression(
                  "==",
                  UnaryExpression("typeof", Identifier("location")),
                  Literal("undefined")
                ),
                test
              );
            }
            nodes.push(
              IfStatement(test, this.getCounterMeasuresCode() || [], null)
            );
          }

          break;
      }

      var body = getBlockBody(block);
      var randomIndex = getRandomInteger(0, body.length);

      body.splice(randomIndex, 0, ...nodes);
    };
  }
}
