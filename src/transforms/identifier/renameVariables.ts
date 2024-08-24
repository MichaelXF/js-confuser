import { NodePath, PluginObj } from "@babel/core";
import { Binding, Scope } from "@babel/traverse";
import { PluginArg } from "../plugin";
import * as t from "@babel/types";
import { Order } from "../../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.RenameVariables);

  // Keep track of available names to reuse
  const availableNames: string[] = [];

  const generateNewName = (scope: Scope): string => {
    let newName;

    // Always generate a new name
    newName = availableNames.pop() || me.generateRandomIdentifier();

    // Ensure the new name isn't already used in the scope
    while (scope.hasBinding(newName) || scope.hasGlobal(newName)) {
      newName = me.generateRandomIdentifier();
    }

    return newName;
  };

  var renamedSet = new WeakSet<Binding>();

  return {
    visitor: {
      Scopable: {
        exit(path: NodePath<t.Scopable>) {
          var createdNames = [];

          Object.keys(path.scope.bindings).forEach((name) => {
            me.log("Checking", name);

            const binding = path.scope.bindings[name];
            if (renamedSet.has(binding)) return;

            const newName = generateNewName(path.scope);

            me.log("Renaming", name, "to", newName);

            path.scope.rename(name, newName);
            renamedSet.add(binding);
            if (name !== newName) {
              createdNames.push(newName);
            }
          });

          me.log("Created names", createdNames);

          availableNames.push(...createdNames);
        },
      },
    },
  };
};
