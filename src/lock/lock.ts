import { NodePath, PluginObj } from "@babel/core";
import { PluginArg } from "../transforms/plugin";
import { Order } from "../order";
import { chance, choice } from "../utils/random-utils";
import Template from "../templates/template";
import * as t from "@babel/types";
import { CustomLock } from "../options";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Lock);

  if (me.options.lock.startDate instanceof Date) {
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
          regexString: t.stringLiteral(regexString.toString()),
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
              const regExp=new RegExp('\\n');
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
  let invokeCountermeasuresFnName;

  if (me.options.lock.countermeasures) {
    invokeCountermeasuresFnName = me.getPlaceholder("invokeCountermeasures");
  }

  function createCountermeasuresCode(): t.Statement[] {
    if (invokeCountermeasuresFnName) {
      return new Template(`${invokeCountermeasuresFnName}()`).compile();
    }

    return new Template(`while(true){}`).compile();
  }

  function applyLockToBlock(path: NodePath<t.Block>, customLock: CustomLock) {
    let times = timesMap.get(customLock);

    if (typeof times === "undefined") {
      times = 0;
    }

    let maxCount = customLock.maxCount || 100; // 100 is default max count
    let minCount = customLock.minCount || 1; // 1 is default min count

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
  }

  return {
    visitor: {
      Identifier: {
        enter(path) {
          console.log(path.node.name);
          if (path.node.name !== me.options.lock.countermeasures) {
            return;
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
      },
      Program: {
        exit(path) {
          // Insert invokeCountermeasures function

          if (invokeCountermeasuresFnName) {
            if (!countermeasuresNode) {
              me.warn(
                "Countermeasures function named '" +
                  me.options.lock.countermeasures +
                  "' was not found."
              );
            }

            var hasInvoked = me.getPlaceholder();
            var statements = new Template(`
                var ${hasInvoked} = false;
                function ${invokeCountermeasuresFnName}(){
                  if(${hasInvoked}) return;
                  ${hasInvoked} = true;
                  ${me.options.lock.countermeasures}();
                }
                `).compile();

            path.unshiftContainer("body", statements).forEach((p) => p.skip());
          }
        },
      },
      Block: {
        exit(path) {
          var customLock = choice(me.options.lock.customLocks);
          if (customLock) {
            applyLockToBlock(path, customLock);
          }
        },
      },
    },
  };
};
