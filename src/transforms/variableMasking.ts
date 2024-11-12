import { Binding, NodePath } from "@babel/traverse";
import { PluginArg, PluginObject } from "./plugin";
import * as t from "@babel/types";
import Template from "../templates/template";
import { Order } from "../order";
import {
  NodeSymbol,
  PREDICTABLE,
  reservedIdentifiers,
  UNSAFE,
  variableFunctionName,
} from "../constants";
import {
  ensureComputedExpression,
  getFunctionName,
  isDefiningIdentifier,
  isStrictMode,
  isVariableIdentifier,
  prepend,
  replaceDefiningIdentifierToMemberExpression,
} from "../utils/ast-utils";
import {
  computeFunctionLength,
  isVariableFunctionIdentifier,
} from "../utils/function-utils";
import { ok } from "assert";
import { NameGen } from "../utils/NameGen";
import { choice, getRandomInteger } from "../utils/random-utils";
import { createLiteral } from "../utils/node";

export default ({ Plugin }: PluginArg): PluginObject => {
  const me = Plugin(Order.VariableMasking, {
    changeData: {
      functions: 0,
    },
  });

  const transformFunction = (fnPath: NodePath<t.Function>) => {
    // Do not apply to getter/setter methods
    if (fnPath.isObjectMethod() && fnPath.node.kind !== "method") {
      return;
    }

    // Do not apply to class getters/setters
    if (fnPath.isClassMethod() && fnPath.node.kind !== "method") {
      return;
    }

    // Do not apply to async or generator functions
    if (fnPath.node.generator || fnPath.node.async) {
      return;
    }

    // Do not apply to functions with rest parameters or destructuring
    if (fnPath.node.params.some((param) => !t.isIdentifier(param))) {
      return;
    }

    // Do not apply to 'use strict' functions
    if (isStrictMode(fnPath)) return;

    // Do not apply to functions marked unsafe
    if ((fnPath.node as NodeSymbol)[UNSAFE]) return;

    const functionName = getFunctionName(fnPath);

    if (!me.computeProbabilityMap(me.options.variableMasking, functionName)) {
      return;
    }

    const stackName = me.getPlaceholder() + "_varMask";
    const stackMap = new Map<Binding, number | string>();
    const propertyGen = new NameGen("mangled");
    const stackKeys = new Set<string>();
    let needsStack = false;

    const illegalBindings = new Set<Binding>();

    function checkBinding(binding: Binding) {
      // Custom illegal check
      // Variable Declarations with more than one declarator are not supported
      // They can be inserted from the user's code even though Preparation phase should prevent it
      // String Compression library includes such code
      // TODO: Support multiple declarators
      var variableDeclaration = binding.path.find((p) =>
        p.isVariableDeclaration()
      ) as NodePath<t.VariableDeclaration>;
      if (
        variableDeclaration &&
        variableDeclaration.node.declarations.length > 1
      ) {
        return false;
      }

      function checkForUnsafe(valuePath: NodePath) {
        var hasUnsafeNode = false;

        valuePath.traverse({
          ThisExpression(path) {
            hasUnsafeNode = true;
            path.stop();
          },
          Function(path) {
            if ((path.node as NodeSymbol)[UNSAFE]) {
              hasUnsafeNode = true;
              path.stop();
            }
          },
        });

        return hasUnsafeNode;
      }

      // Check function value for 'this'
      // Adding function expression to the stack (member expression)
      // would break the 'this' context
      if (binding.path.isVariableDeclarator()) {
        let init = binding.path.get("init");
        if (init.node) {
          if (checkForUnsafe(init)) return false;
        }
      }

      // x = function(){ return this }
      // Cannot be transformed to x = stack[0] as 'this' would change
      for (var assignment of binding.constantViolations) {
        if (checkForUnsafe(assignment)) return false;
      }

      // __JS_CONFUSER_VAR__(identifier) -> __JS_CONFUSER_VAR__(stack.identifier)
      // This cannot be transformed as it would break the user's code
      for (var referencePath of binding.referencePaths) {
        if (isVariableFunctionIdentifier(referencePath)) {
          return false;
        }
      }

      return true;
    }

    for (const param of fnPath.get("params")) {
      ok(param.isIdentifier());

      const paramName = param.node.name;
      const binding = param.scope.getBinding(paramName);

      if (!binding || !checkBinding(binding)) return;

      ok(!stackMap.has(binding));
      stackKeys.add(stackMap.size.toString());
      stackMap.set(binding, stackMap.size);
    }

    fnPath.traverse({
      Identifier(path) {
        if (!isVariableIdentifier(path)) return;
        if (fnPath.get("id") === path) return; // Skip this function's name (Test #21)

        if (reservedIdentifiers.has(path.node.name)) return;
        if (me.options.globalVariables.has(path.node.name)) return;
        if (path.node.name === stackName) return;
        if (path.node.name === variableFunctionName) return;

        const binding = path.scope.getBinding(path.node.name);
        if (!binding || binding.scope !== fnPath.scope) return;
        if (illegalBindings.has(binding)) return;

        needsStack = true;

        let index = stackMap.get(binding);
        if (typeof index === "undefined") {
          // Only transform var and let bindings
          // Function declarations could be hoisted and changing them to declarations is breaking
          if (!["var", "let"].includes(binding.kind)) {
            illegalBindings.add(binding);
            return;
          }

          if (!checkBinding(binding)) {
            illegalBindings.add(binding);
            return;
          }

          do {
            index = choice([
              stackMap.size,
              propertyGen.generate(),
              getRandomInteger(-250, 250),
            ]);
          } while (!index || stackKeys.has(index.toString()));

          stackMap.set(binding, index);
          stackKeys.add(index.toString());
        }

        const memberExpression = t.memberExpression(
          t.identifier(stackName),
          createLiteral(index),
          true
        );

        if (isDefiningIdentifier(path)) {
          replaceDefiningIdentifierToMemberExpression(path, memberExpression);

          return;
        }

        ensureComputedExpression(path);
        path.replaceWith(memberExpression);
      },
    });

    if (!needsStack) return;

    const originalParamCount = fnPath.node.params.length;
    const originalLength = computeFunctionLength(fnPath);

    fnPath.node.params = [t.restElement(t.identifier(stackName))];

    // Discard extraneous parameters
    // Predictable functions are guaranteed to not have extraneous parameters
    if (!(fnPath.node as NodeSymbol)[PREDICTABLE]) {
      prepend(
        fnPath,
        new Template(`${stackName}["length"] = {originalParamCount};`).single({
          originalParamCount: t.numericLiteral(originalParamCount),
        })
      );
    }

    // Function is no longer predictable
    (fnPath.node as NodeSymbol)[PREDICTABLE] = false;

    fnPath.scope.registerBinding("param", fnPath.get("params")[0], fnPath);

    me.setFunctionLength(fnPath, originalLength);

    me.changeData.functions++;
  };

  return {
    visitor: {
      Function: {
        exit(path: NodePath<t.Function>) {
          if (!path.get("body").isBlockStatement()) return;

          transformFunction(path);
        },
      },
      Program: {
        enter(path) {
          path.scope.crawl();
        },
      },
    },
  };
};
