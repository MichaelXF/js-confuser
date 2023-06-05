import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { walk } from "../../traverse";
import { Node } from "../../util/gen";
import { getIdentifierInfo } from "../../util/identifiers";
import {
  isVarContext,
  isContext,
  isLexContext,
  clone,
} from "../../util/insert";
import Transform from "../transform";
import { reservedIdentifiers } from "../../constants";
import { ComputeProbabilityMap } from "../../probability";
import VariableAnalysis from "./variableAnalysis";

/**
 * Rename variables to randomly generated names.
 *
 * - 1. First collect data on identifiers in all scope using 'VariableAnalysis'
 * - 2. After 'VariableAnalysis' is finished start applying to each scope (top-down)
 * - 3. Each scope, find the all names used here and exclude those names from being re-named
 * - 4. Now loop through all the defined names in this scope and set it to a random name (or re-use previously generated name)
 * - 5. Update all the Identifiers node's 'name' property to reflect this change
 */
export default class RenameVariables extends Transform {
  // Names already used
  generated: string[];

  // Map of Context->Object of changes
  changed: Map<Node, { [name: string]: string }>;

  // Ref to VariableAnalysis data
  variableAnalysis: VariableAnalysis;

  constructor(o) {
    super(o, ObfuscateOrder.RenameVariables);

    this.changed = new Map();

    // 1.
    this.variableAnalysis = new VariableAnalysis(o);
    this.before.push(this.variableAnalysis);
    this.generated = [];
  }

  match(object: Node, parents: Node[]) {
    return isContext(object);
  }

  transform(object: Node, parents: Node[]) {
    // 2. Notice this is on 'onEnter' (top-down)
    var isGlobal = object.type == "Program";
    var type = isGlobal
      ? "root"
      : isVarContext(object)
      ? "var"
      : isLexContext(object)
      ? "lex"
      : undefined;

    ok(type);

    var newNames = Object.create(null);

    var defined = this.variableAnalysis.defined.get(object) || new Set();
    var references = this.variableAnalysis.references.get(object) || new Set();

    // No changes needed here
    if (!defined && !this.changed.has(object)) {
      this.changed.set(object, Object.create(null));
      return;
    }

    // Names possible to be re-used here
    var possible = new Set<string>();

    // 3. Try to re-use names when possible
    if (this.generated.length && !isGlobal) {
      var allReferences = new Set<string>();
      var nope = new Set(defined);
      walk(object, [], (o, p) => {
        var ref = this.variableAnalysis.references.get(o);
        if (ref) {
          ref.forEach((x) => allReferences.add(x));
        }

        var def = this.variableAnalysis.defined.get(o);
        if (def) {
          def.forEach((x) => allReferences.add(x));
        }
      });

      var passed = new Set<string>();
      parents.forEach((p) => {
        var changes = this.changed.get(p);
        if (changes) {
          Object.keys(changes).forEach((x) => {
            var name = changes[x];

            if (!allReferences.has(x) && !references.has(x)) {
              passed.add(name);
            } else {
              nope.add(name);
            }
          });
        }
      });

      nope.forEach((x) => passed.delete(x));

      possible = passed;
    }

    // 4. Defined names to new names
    for (var name of defined) {
      if (
        !name.startsWith("__NO_JS_CONFUSER_RENAME__") && // Variables prefixed with '__NO_JS_CONFUSER_RENAME__' are never renamed
        (isGlobal && !name.startsWith("__p_") // Variables prefixed with '__p_' are created by the obfuscator, always renamed
          ? ComputeProbabilityMap(this.options.renameGlobals, (x) => x, name)
          : true) &&
        ComputeProbabilityMap(
          // Check the user's option for renaming variables
          this.options.renameVariables,
          (x) => x,
          name,
          isGlobal
        )
      ) {
        // Create a new name from (1) or (2) methods
        var newName: string;
        do {
          if (possible.size) {
            // (1) Re-use previously generated name
            var first = possible.values().next().value;
            possible.delete(first);
            newName = first;
          } else {
            // (2) Create a new name with `generateIdentifier` function
            var generatedName = this.generateIdentifier();

            newName = generatedName;
            this.generated.push(generatedName);
          }
        } while (this.variableAnalysis.globals.has(newName)); // Ensure global names aren't overridden

        newNames[name] = newName;
      } else {
        // This variable name was deemed not to be renamed.
        newNames[name] = name;
      }
    }

    this.changed.set(object, newNames);

    // 5. Update Identifier node's 'name' property
    walk(object, parents, (o, p) => {
      if (o.type == "Identifier") {
        if (
          reservedIdentifiers.has(o.name) ||
          this.options.globalVariables.has(o.name)
        ) {
          return;
        }

        if (o.$renamed) {
          return;
        }

        var info = getIdentifierInfo(o, p);

        if (info.spec.isExported) {
          return;
        }

        if (!info.spec.isReferenced) {
          return;
        }

        var contexts = [o, ...p].filter((x) => isContext(x));
        var newName = null;

        for (var check of contexts) {
          if (
            this.variableAnalysis.defined.has(check) &&
            this.variableAnalysis.defined.get(check).has(o.name)
          ) {
            if (this.changed.has(check) && this.changed.get(check)[o.name]) {
              newName = this.changed.get(check)[o.name];
              break;
            }
          }
        }

        if (newName && typeof newName === "string") {
          // Strange behavior where the `local` and `imported` objects are the same
          if (info.isImportSpecifier) {
            var importSpecifierIndex = p.findIndex(
              (x) => x.type === "ImportSpecifier"
            );
            if (
              importSpecifierIndex != -1 &&
              p[importSpecifierIndex].imported ===
                (p[importSpecifierIndex - 1] || o) &&
              p[importSpecifierIndex].imported &&
              p[importSpecifierIndex].imported.type === "Identifier"
            ) {
              p[importSpecifierIndex].imported = clone(
                p[importSpecifierIndex - 1] || o
              );
            }
          }

          // console.log(o.name, "->", newName);
          o.name = newName;
          o.$renamed = true;
        }
      }
    });
  }
}
