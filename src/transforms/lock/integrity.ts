import { PluginArg, PluginObject } from "../plugin";
import { Order } from "../../order";
import { getRandomInteger } from "../../utils/random-utils";
import { HashFunction } from "../../templates/integrityTemplate";
import * as t from "@babel/types";
import Template from "../../templates/template";
import { NodePath } from "@babel/traverse";
import { NameGen } from "../../utils/NameGen";

export interface IntegrityInterface {
  fnPath: NodePath<t.FunctionDeclaration>;
  fnName: string;
}

export const INTEGRITY = Symbol("Integrity");

export interface NodeIntegrity {
  [INTEGRITY]?: IntegrityInterface;
}

/**
 * Integrity has two passes:
 *
 * - First in the 'lock' plugin to select functions and prepare them for Integrity
 * - Secondly here to apply the integrity check
 *
 * This transformation must run last as any changes to the code will break the hash
 */
export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.Integrity, {
    changeData: {
      functions: 0,
    },
  });

  const nameGen = new NameGen(me.options.identifierGenerator, {
    avoidObjectPrototype: true,
    avoidReserved: true,
  });

  return {
    visitor: {
      Program: {
        enter(path) {
          path.scope.crawl();
        },
      },
      FunctionDeclaration: {
        exit(funcDecPath) {
          const integrityInterface = (funcDecPath.node as NodeIntegrity)[
            INTEGRITY
          ];
          if (!integrityInterface) return;

          const newFnPath = integrityInterface.fnPath;
          if (newFnPath.removed) return;

          const newFunctionDeclaration = newFnPath.node;
          if (
            !newFunctionDeclaration ||
            !t.isFunctionDeclaration(newFunctionDeclaration)
          )
            return;

          const { integrityHashName: hashFnName } = me.globalState.internals;
          const obfuscatedHashFnName = me.obfuscator.getObfuscatedVariableName(
            hashFnName,
            funcDecPath.find((p) => p.isProgram()).node
          );

          const newFnName = newFunctionDeclaration.id.name;
          const binding = newFnPath.scope.getBinding(newFnName);

          // Function is redefined, do not apply integrity
          if (!binding || binding.constantViolations.length > 0) return;

          var code = me.obfuscator.generateCode(newFunctionDeclaration);
          var codeTrimmed = code.replace(
            me.globalState.lock.integrity.sensitivityRegex,
            ""
          );

          var seed = getRandomInteger(0, 10000000);

          var hashCode = HashFunction(codeTrimmed, seed);

          const selfName = funcDecPath.node.id.name;
          const selfCacheProperty = nameGen.generate();
          const selfCacheString = `${selfName}.${selfCacheProperty}`;

          // me.log(codeTrimmed, hashCode);
          me.changeData.functions++;

          const hashName = nameGen.generate();

          funcDecPath.node.body = t.blockStatement(
            new Template(`
              var {hashName} = ${selfCacheString} || (${selfCacheString} = ${obfuscatedHashFnName}(${newFunctionDeclaration.id.name}, ${seed}));
          if({hashName} === ${hashCode}) {
            {originalBody}
          } else {
            {countermeasures}  
          }
          `).compile({
              originalBody: funcDecPath.node.body.body,
              hashName,
              countermeasures: () =>
                me.globalState.lock.createCountermeasuresCode(),
            }),
            // Preserve directives
            funcDecPath.node.body.directives
          );
        },
      },
    },
  };
};
