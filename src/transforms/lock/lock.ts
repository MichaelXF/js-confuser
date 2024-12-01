import { NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "../plugin";
import { Order } from "../../order";
import { chance, choice } from "../../utils/random-utils";
import Template from "../../templates/template";
import * as t from "@babel/types";
import { CustomLock } from "../../options";
import {
  getFunctionName,
  getParentFunctionOrProgram,
  isDefiningIdentifier,
  isVariableIdentifier,
  prependProgram,
} from "../../utils/ast-utils";
import { INTEGRITY, NodeIntegrity } from "./integrity";
import { HashTemplate } from "../../templates/integrityTemplate";
import {
  MULTI_TRANSFORM,
  NodeSymbol,
  PREDICTABLE,
  SKIP,
  UNSAFE,
} from "../../constants";
import {
  IndexOfTemplate,
  NativeFunctionTemplate,
  StrictModeTemplate,
} from "../../templates/tamperProtectionTemplates";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Lock, {
    changeData: {
      locksInserted: 0,
    },
  });

  if (me.options.lock.startDate instanceof Date) {
    // Ensure date is in the past
    if (me.options.lock.startDate.getTime() > Date.now()) {
      me.warn("lock.startDate is detected to be in the future");
    }

    me.options.lock.customLocks.push({
      code: [
        `
      if(Date.now()<${me.options.lock.startDate.getTime()}) {
        {countermeasures}
      }
      `,
        `
      if((new Date()).getTime()<${me.options.lock.startDate.getTime()}) {
        {countermeasures}
      }
      `,
      ],
      percentagePerBlock: 0.5,
    });
  }

  if (me.options.lock.endDate instanceof Date) {
    // Ensure date is in the future
    if (me.options.lock.endDate.getTime() < Date.now()) {
      me.warn("lock.endDate is detected to be in the past");
    }

    me.options.lock.customLocks.push({
      code: [
        `
      if(Date.now()>${me.options.lock.endDate.getTime()}) {
        {countermeasures}
      }
      `,
        `
      if((new Date()).getTime()>${me.options.lock.endDate.getTime()}) {
        {countermeasures}
      }
      `,
      ],
      percentagePerBlock: 0.5,
    });
  }

  if (me.options.lock.domainLock) {
    var domainArray = Array.isArray(me.options.lock.domainLock)
      ? me.options.lock.domainLock
      : [me.options.lock.domainLock];

    for (const regexString of domainArray) {
      me.options.lock.customLocks.push({
        code: new Template(`
          if(!new RegExp({regexString}).test(window.location.href)) {
            {countermeasures}
          }
          `).setDefaultVariables({
          regexString: () => t.stringLiteral(regexString.toString()),
        }),
        percentagePerBlock: 0.5,
      });
    }
  }

  if (me.options.lock.selfDefending) {
    me.options.lock.customLocks.push({
      code: `
      (
        function(){
          // Breaks any code formatter
          var namedFunction = function(){
            const test = function(){
              const regExp= new RegExp('\\n');
              return regExp['test'](namedFunction)
            };

            if(test()) {
              {countermeasures}
            }
          }

          return namedFunction();
        }
    )();
      `,
      percentagePerBlock: 0.5,
    });
  }

  if (me.options.lock.antiDebug) {
    me.options.lock.customLocks.push({
      code: `
      debugger;
      `,
      percentagePerBlock: 0.5,
    });
  }

  const timesMap = new WeakMap<CustomLock, number>();

  let countermeasuresNode: NodePath<t.Identifier>;
  let invokeCountermeasuresFnName: string;

  if (me.options.lock.countermeasures) {
    invokeCountermeasuresFnName = me.getPlaceholder("invokeCountermeasures");

    me.globalState.internals.invokeCountermeasuresFnName =
      invokeCountermeasuresFnName;
  }

  var createCountermeasuresCode = () => {
    if (invokeCountermeasuresFnName) {
      return new Template(`${invokeCountermeasuresFnName}()`).compile();
    }

    if (me.options.lock.countermeasures === false) {
      return [];
    }

    return new Template(`while(true){}`).compile();
  };
  me.globalState.lock.createCountermeasuresCode = createCountermeasuresCode;

  const defaultMaxCount = me.options.lock.defaultMaxCount ?? 25;

  function applyLockToBlock(path: NodePath<t.Block>, customLock: CustomLock) {
    let times = timesMap.get(customLock) || 0;

    let maxCount = customLock.maxCount ?? defaultMaxCount; // 25 is default max count
    let minCount = customLock.minCount ?? 1; // 1 is default min count

    if (maxCount >= 0 && times > maxCount) {
      // Limit creation, allowing -1 to disable the limit entirely
      return;
    }

    // The Program always gets a lock
    // Else based on the percentage
    // Try to reach the minimum count
    if (
      !path.isProgram() &&
      !chance(customLock.percentagePerBlock * 100) &&
      times >= minCount
    ) {
      return;
    }

    // Increment the times
    timesMap.set(customLock, times + 1);

    const lockCode = Array.isArray(customLock.code)
      ? choice(customLock.code)
      : customLock.code;

    const template =
      typeof lockCode === "string" ? new Template(lockCode) : lockCode;
    const lockNodes = template.compile({
      countermeasures: () => createCountermeasuresCode(),
    });
    var p = path.unshiftContainer("body", lockNodes);
    p.forEach((p) => p.skip());

    me.changeData.locksInserted++;
  }

  return {
    visitor: {
      BindingIdentifier(path) {
        if (path.node.name !== me.options.lock.countermeasures) {
          return;
        }

        // Exclude labels
        if (!isVariableIdentifier(path)) return;

        if (!isDefiningIdentifier(path)) {
          // Reassignments are not allowed

          me.error("Countermeasures function cannot be reassigned");
        }

        if (countermeasuresNode) {
          // Disallow multiple countermeasures functions

          me.error(
            "Countermeasures function was already defined, it must have a unique name from the rest of your code"
          );
        }

        if (
          path.scope.getBinding(path.node.name).scope !==
          path.scope.getProgramParent()
        ) {
          me.error(
            "Countermeasures function must be defined at the global level"
          );
        }

        countermeasuresNode = path;
      },

      Block: {
        exit(path) {
          var customLock = choice(me.options.lock.customLocks);
          if (customLock) {
            applyLockToBlock(path, customLock);
          }
        },
      },

      Program: {
        exit(path) {
          // Insert nativeFunctionCheck
          if (me.options.lock.tamperProtection) {
            // Disallow strict mode
            // Tamper Protection uses non-strict mode features:
            // - eval() with local scope assignments
            const directives = path.get("directives");
            for (var directive of directives) {
              if (directive.node.value.value === "use strict") {
                me.error(
                  "Tamper Protection cannot be applied to code in strict mode. Disable strict mode by removing the 'use strict' directive, or disable Tamper Protection."
                );
              }
            }

            var nativeFunctionName =
              me.getPlaceholder() + "_nativeFunctionCheck";

            me.obfuscator.globalState.internals.nativeFunctionName =
              nativeFunctionName;

            // Ensure program is not in strict mode
            // Tamper Protection forces non-strict mode
            prependProgram(
              path,
              StrictModeTemplate.compile({
                nativeFunctionName,
                countermeasures: createCountermeasuresCode(),
              })
            );

            const nativeFunctionDeclaration = NativeFunctionTemplate.single({
              nativeFunctionName,
              countermeasures: createCountermeasuresCode(),
              IndexOfTemplate: IndexOfTemplate,
            });

            // Checks function's toString() value for [native code] signature
            prependProgram(path, nativeFunctionDeclaration);
          }

          // Insert invokeCountermeasures function
          if (invokeCountermeasuresFnName) {
            if (!countermeasuresNode) {
              me.error(
                "Countermeasures function named '" +
                  me.options.lock.countermeasures +
                  "' was not found."
              );
            }

            var hasInvoked = me.getPlaceholder("hasInvoked");
            var statements = new Template(`
                var ${hasInvoked} = false;
                function ${invokeCountermeasuresFnName}(){
                  if(${hasInvoked}) return;
                  ${hasInvoked} = true;
                  ${me.options.lock.countermeasures}();
                }
                `)
              .addSymbols(MULTI_TRANSFORM)
              .compile();

            prependProgram(path, statements).forEach((p) => p.skip());
          }

          if (me.options.lock.integrity) {
            const hashFnName = me.getPlaceholder() + "_hash";
            const imulFnName = me.getPlaceholder() + "_imul";

            const { sensitivityRegex } = me.globalState.lock.integrity;
            me.globalState.internals.integrityHashName = hashFnName;

            const hashCode = HashTemplate.compile({
              imul: imulFnName,
              name: hashFnName,
              hashingUtilFnName: me.getPlaceholder(),
              sensitivityRegex: () =>
                t.newExpression(t.identifier("RegExp"), [
                  t.stringLiteral(sensitivityRegex.source),
                  t.stringLiteral(sensitivityRegex.flags),
                ]),
            });

            prependProgram(path, hashCode);
          }
        },
      },

      // Integrity first pass
      // Functions are prepared for Integrity by simply extracting the function body
      // The extracted function is hashed in the 'integrity' plugin
      FunctionDeclaration: {
        exit(funcDecPath) {
          if (!me.options.lock.integrity) return;

          // Mark functions for integrity
          // Don't apply to async or generator functions
          if (funcDecPath.node.async || funcDecPath.node.generator) return;

          if (funcDecPath.find((p) => !!(p.node as NodeSymbol)[SKIP])) return;

          var program = getParentFunctionOrProgram(funcDecPath);
          // Only top-level functions
          if (!program.isProgram()) return;

          // Check user's custom implementation
          const functionName = getFunctionName(funcDecPath);
          // Don't apply to the countermeasures function (Intended)
          if (
            me.options.lock.countermeasures &&
            functionName === me.options.lock.countermeasures
          )
            return;
          // Don't apply to invokeCountermeasures function (Intended)
          if (me.obfuscator.isInternalVariable(functionName)) return;

          if (
            !me.computeProbabilityMap(me.options.lock.integrity, functionName)
          )
            return;

          var newFnName = me.getPlaceholder();
          var newFunctionDeclaration = t.functionDeclaration(
            t.identifier(newFnName),
            funcDecPath.node.params,
            funcDecPath.node.body
          );

          // Clone semantic symbols like (UNSAFE, PREDICTABLE, MULTI_TRANSFORM, etc)
          const source = funcDecPath.node;
          Object.getOwnPropertySymbols(source).forEach((symbol) => {
            newFunctionDeclaration[symbol] = source[symbol];
          });

          (newFunctionDeclaration as NodeSymbol)[SKIP] = true;

          var [newFnPath] = program.unshiftContainer(
            "body",
            newFunctionDeclaration
          );

          // Function simply calls the new function
          // In the case Integrity cannot transform the function, the original behavior is preserved
          funcDecPath.node.body = t.blockStatement(
            new Template(`
              return  ${newFnName}(...arguments);
              `).compile(),
            funcDecPath.node.body.directives
          );

          // Parameters no longer needed, using 'arguments' instead
          funcDecPath.node.params = [];

          // Mark the function as unsafe - use of 'arguments' is unsafe
          (funcDecPath.node as NodeSymbol)[UNSAFE] = true;

          // Params changed - function is no longer predictable
          (funcDecPath.node as NodeSymbol)[PREDICTABLE] = false;

          // Mark the function for integrity
          (funcDecPath.node as NodeIntegrity)[INTEGRITY] = {
            fnPath: newFnPath,
            fnName: newFnName,
          };
        },
      },
    },
  };
};
