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
  VariableDeclaration,
  ThisExpression,
  VariableDeclarator,
  Location,
  LogicalExpression,
  SequenceExpression,
} from "../../util/gen";
import traverse, { getBlock, isBlock } from "../../traverse";
import { choice, getRandomInteger } from "../../util/random";
import { CrashTemplate1, CrashTemplate2 } from "../../templates/crash";
import { getBlockBody, getVarContext, prepend } from "../../util/insert";
import Template from "../../templates/template";
import { ObfuscateOrder } from "../../order";
import Integrity from "./integrity";
import AntiDebug from "./antiDebug";
import { getIdentifierInfo } from "../../util/identifiers";
import { isLoop, isValidIdentifier } from "../../util/compare";
import { ok } from "assert";
import { variableFunctionName } from "../../constants";
import { IndexOfTemplate } from "../../templates/core";

/**
 * Applies browser & date locks.
 */
export default class Lock extends Transform {
  globalVar: string;
  counterMeasuresNode: Location;
  iosDetectFn: string;

  /**
   * This is a boolean variable injected into the source code determining wether the countermeasures function has been called.
   * This is used to prevent infinite loops from happening
   */
  counterMeasuresActivated: string;

  /**
   * The name of the native function that is used to check runtime calls for tampering
   */
  nativeFunctionName: string;

  made: number;

  shouldTransformNativeFunction(nameAndPropertyPath: string[]) {
    if (!this.options.lock.tamperProtection) {
      return false;
    }

    if (typeof this.options.lock.tamperProtection === "function") {
      return this.options.lock.tamperProtection(nameAndPropertyPath.join("."));
    }

    if (
      this.options.target === "browser" &&
      nameAndPropertyPath.length === 1 &&
      nameAndPropertyPath[0] === "fetch"
    ) {
      return true;
    }

    // TODO: Allow user to customize this behavior
    var globalObject = typeof window !== "undefined" ? window : global;
    var fn = globalObject;
    for (var item of nameAndPropertyPath) {
      fn = fn[item];
      if (typeof fn === "undefined") return false;
    }

    var hasNativeCode =
      typeof fn === "function" && ("" + fn).includes("[native code]");

    return hasNativeCode;
  }

  constructor(o) {
    super(o, ObfuscateOrder.Lock);

    // Removed feature
    // if (this.options.lock.startDate && this.options.lock.endDate) {
    //   this.before.push(new LockStrings(o));
    // }

    if (this.options.lock.integrity) {
      this.before.push(new Integrity(o, this));
    }

    if (this.options.lock.antiDebug) {
      this.before.push(new AntiDebug(o, this));
    }

    this.made = 0;
  }

  apply(tree) {
    if (
      typeof this.options.lock.countermeasures === "string" &&
      isValidIdentifier(this.options.lock.countermeasures)
    ) {
      traverse(tree, (object, parents) => {
        if (
          object.type == "Identifier" &&
          object.name === this.options.lock.countermeasures
        ) {
          var info = getIdentifierInfo(object, parents);
          if (info.spec.isDefined) {
            if (this.counterMeasuresNode) {
              throw new Error(
                "Countermeasures function was already defined, it must have a unique name from the rest of your code"
              );
            } else {
              var definingContext = getVarContext(parents[0], parents.slice(1));
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
      });

      if (!this.counterMeasuresNode) {
        throw new Error(
          "Countermeasures function named '" +
            this.options.lock.countermeasures +
            "' was not found."
        );
      }
    }

    super.apply(tree);

    if (this.options.lock.tamperProtection) {
      this.nativeFunctionName = this.getPlaceholder() + "_lockNative";

      // Ensure program is not in strict mode
      // Tamper Protection forces non-strict mode

      var strictModeCheck = new Template(`
        (function(){
          function isStrictMode(){
            try {
              var arr = []
              delete arr["length"]
            } catch(e) {
              return true;
            }
            return false;
          }

          if(isStrictMode()) {
            {countermeasures}
            ${this.nativeFunctionName} = undefined;
          }
        })()
        `).single({
        countermeasures: this.getCounterMeasuresCode(tree, []),
      });

      // $multiTransformSkip is used to prevent scoping between transformations
      strictModeCheck.$multiTransformSkip = true;

      prepend(tree, strictModeCheck);

      var nativeFunctionCheck = new Template(`
        function ${this.nativeFunctionName}() {
          {IndexOfTemplate}
        
          function checkFunction(fn){
            if (indexOf("" + fn, '{ [native code] }') === -1
            ||
            typeof Object.getOwnPropertyDescriptor(fn, "toString") !== "undefined"
            ) {
              {countermeasures}
              return undefined
            }

            return fn;
          }

          var args = arguments
          if(args.length === 1) {
            return checkFunction(args[0]);
          } else if (args.length === 2) {
            var object = args[0];
            var property = args[1];

            var fn = object[property];
            fn = checkFunction(fn);

            return fn.bind(object);
          }
        }`).single({
        IndexOfTemplate: IndexOfTemplate,
        countermeasures: this.getCounterMeasuresCode(tree, []),
      });

      // $multiTransformSkip is used to prevent scoping between transformations
      nativeFunctionCheck.$multiTransformSkip = true;

      prepend(tree, nativeFunctionCheck);
    }
  }

  getCounterMeasuresCode(object: Node, parents: Node[]): Node[] {
    var opt = this.options.lock.countermeasures;

    if (opt === false) {
      return null;
    }

    // Call function
    if (typeof opt === "string") {
      if (!this.counterMeasuresActivated) {
        this.counterMeasuresActivated = this.getPlaceholder();

        prepend(
          parents[parents.length - 1] || object,
          VariableDeclaration(VariableDeclarator(this.counterMeasuresActivated))
        );
      }

      // Since Lock occurs before variable renaming, we are using the pre-obfuscated function name
      return [
        ExpressionStatement(
          LogicalExpression(
            "||",
            Identifier(this.counterMeasuresActivated),
            SequenceExpression([
              AssignmentExpression(
                "=",
                Identifier(this.counterMeasuresActivated),
                Literal(true)
              ),
              CallExpression(new Template(opt).single().expression, []),
            ])
          )
        ),
      ];
    }

    // Default fallback to infinite loop
    var varName = this.getPlaceholder();
    return choice([CrashTemplate1, CrashTemplate2]).compile({
      var: varName,
    });
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

    if (this.options.lock.context && this.options.lock.context.length) {
      choices.push("context");
    }
    if (this.options.lock.browserLock && this.options.lock.browserLock.length) {
      choices.push("browserLock");
    }
    if (this.options.lock.osLock && this.options.lock.osLock.length) {
      choices.push("osLock");
    }
    if (this.options.lock.selfDefending) {
      choices.push("selfDefending");
    }

    if (!choices.length) {
      return;
    }

    return () => {
      this.made++;
      if (this.made > 150) {
        return;
      }

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
      var offset = 0;

      switch (type) {
        case "selfDefending":
          // A very simple mechanism inspired from https://github.com/javascript-obfuscator/javascript-obfuscator/blob/master/src/custom-code-helpers/self-defending/templates/SelfDefendingNoEvalTemplate.ts
          // regExp checks for a newline, formatters add these
          var callExpression = new Template(
            `
            (
              function(){
                // Breaks JSNice.org, beautifier.io
                var namedFunction = function(){
                  const test = function(){
                    const regExp=new RegExp('\\n');
                    return regExp['test'](namedFunction)
                  };
                  return test()
                }

                return namedFunction();
              }
            )()
            `
          ).single().expression;

          nodes.push(
            IfStatement(
              callExpression,
              this.getCounterMeasuresCode(object, parents) || [],
              null
            )
          );

          break;

        case "startDate":
          test = BinaryExpression(
            "<",
            dateNow,
            Literal(this.getTime(this.options.lock.startDate))
          );

          nodes.push(
            IfStatement(
              test,
              this.getCounterMeasuresCode(object, parents) || [],
              null
            )
          );

          break;

        case "endDate":
          test = BinaryExpression(
            ">",
            dateNow,
            Literal(this.getTime(this.options.lock.endDate))
          );

          nodes.push(
            IfStatement(
              test,
              this.getCounterMeasuresCode(object, parents) || [],
              null
            )
          );

          break;

        case "context":
          var prop = choice(this.options.lock.context);

          var code = this.getCounterMeasuresCode(object, parents) || [];

          // Todo: Alternative to `this`
          if (!this.globalVar) {
            offset = 1;
            this.globalVar = this.getPlaceholder();
            prepend(
              parents[parents.length - 1] || block,
              VariableDeclaration(
                VariableDeclarator(
                  this.globalVar,
                  LogicalExpression(
                    "||",
                    Identifier(
                      this.options.globalVariables.keys().next().value
                    ),
                    ThisExpression()
                  )
                )
              )
            );
          }

          test = UnaryExpression(
            "!",
            MemberExpression(Identifier(this.globalVar), Literal(prop), true)
          );
          nodes.push(IfStatement(test, code, null));

          break;

        case "osLock":
          var navigatorUserAgent = new Template(
            `window.navigator.userAgent.toLowerCase()`
          ).single().expression;

          ok(this.options.lock.osLock);

          var code = this.getCounterMeasuresCode(object, parents) || [];

          this.options.lock.osLock.forEach((osName) => {
            var agentMatcher = {
              windows: "Win",
              linux: "Linux",
              osx: "Mac",
              android: "Android",
              ios: "---",
            }[osName];
            var thisTest: Node = CallExpression(
              MemberExpression(navigatorUserAgent, Literal("match"), true),
              [Literal(agentMatcher.toLowerCase())]
            );
            if (osName == "ios" && this.options.target === "browser") {
              if (!this.iosDetectFn) {
                this.iosDetectFn = this.getPlaceholder();
                prepend(
                  parents[parents.length - 1] || object,
                  new Template(`function ${this.iosDetectFn}() {
                  return [
                    'iPad Simulator',
                    'iPhone Simulator',
                    'iPod Simulator',
                    'iPad',
                    'iPhone',
                    'iPod'
                  ].includes(navigator.platform)
                  // iPad on iOS 13 detection
                  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
                }`).single()
                );
              }

              thisTest = CallExpression(Identifier(this.iosDetectFn), []);
            }

            if (this.options.target === "node") {
              var platformName =
                { windows: "win32", osx: "darwin", ios: "darwin" }[osName] ||
                osName;
              thisTest = new Template(
                `require('os').platform()==="${platformName}"`
              ).single().expression;
            }

            if (!test) {
              test = thisTest;
            } else {
              test = LogicalExpression("||", { ...test }, thisTest);
            }
          });

          test = UnaryExpression("!", { ...test });
          nodes.push(IfStatement(test, code, null));
          break;

        case "browserLock":
          var navigatorUserAgent = new Template(
            `window.navigator.userAgent.toLowerCase()`
          ).single().expression;

          ok(this.options.lock.browserLock);

          this.options.lock.browserLock.forEach((browserName) => {
            var thisTest: Node = CallExpression(
              MemberExpression(navigatorUserAgent, Literal("match"), true),
              [
                Literal(
                  browserName == "iexplorer"
                    ? "msie"
                    : browserName.toLowerCase()
                ),
              ]
            );

            if (browserName === "safari") {
              thisTest = new Template(
                `/^((?!chrome|android).)*safari/i.test(navigator.userAgent)`
              ).single().expression;
            }

            if (!test) {
              test = thisTest;
            } else {
              test = LogicalExpression("||", { ...test }, thisTest);
            }
          });

          test = UnaryExpression("!", { ...test });
          nodes.push(
            IfStatement(
              test,
              this.getCounterMeasuresCode(object, parents) || [],
              null
            )
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
              test = LogicalExpression(
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
              IfStatement(
                test,
                this.getCounterMeasuresCode(object, parents) || [],
                null
              )
            );
          }

          break;
      }

      if (nodes.length) {
        var body = getBlockBody(block);
        var randomIndex = getRandomInteger(0, body.length) + offset;

        if (randomIndex >= body.length) {
          body.push(...nodes);
        } else {
          body.splice(randomIndex, 0, ...nodes);
        }
      }
    };
  }
}
