import { PluginObj } from "@babel/core";
import { PluginArg } from "../transforms/plugin";
import { Order } from "../order";
import { getRandomInteger } from "../utils/random-utils";
import { HashFunction } from "../templates/integrityTemplate";
import * as t from "@babel/types";
import Template from "../templates/template";
import { NodePath } from "@babel/traverse";

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
export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Integrity);

  return {
    visitor: {
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

          const { hashFnName } = me.globalState.lock.integrity;

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

          me.log(codeTrimmed, hashCode);

          funcDecPath.node.body = t.blockStatement(
            new Template(`
              var hash = ${hashFnName}(${newFunctionDeclaration.id.name}, ${seed});
          if(hash === ${hashCode}) {
            {originalBody}
          } else {
            {countermeasures}  
          }
          `).compile({
              originalBody: funcDecPath.node.body.body,
              countermeasures: () =>
                me.globalState.lock.createCountermeasuresCode(),
            })
          );
        },
      },
    },
  };
};
