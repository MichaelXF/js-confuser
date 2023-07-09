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
  isFunction,
} from "../../util/insert";
import Transform from "../transform";
import {
  noRenameVariablePrefix,
  placeholderVariablePrefix,
  reservedIdentifiers,
} from "../../constants";
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

  // Option to re-use previously generated names
  reusePreviousNames = true;

  constructor(o) {
    super(o, ObfuscateOrder.RenameVariables);

    this.changed = new Map();

    // 1.
    this.variableAnalysis = new VariableAnalysis(o);
    this.before.push(this.variableAnalysis);
    this.generated = [];
  }

  match(object: Node, parents: Node[]) {
    return isContext(object) || object.type === "Identifier";
  }

  transformContext(object: Node, parents: Node[]) {
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
    if (this.reusePreviousNames && this.generated.length && !isGlobal) {
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
        !name.startsWith(noRenameVariablePrefix) && // Variables prefixed with '__NO_JS_CONFUSER_RENAME__' are never renamed
        (isGlobal && !name.startsWith(placeholderVariablePrefix) // Variables prefixed with '__p_' are created by the obfuscator, always renamed
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

    // console.log(object.type, newNames);
    this.changed.set(object, newNames);
  }

  transformIdentifier(object: Node, parents: Node[]) {
    const identifierName = object.name;
    if (
      reservedIdentifiers.has(identifierName) ||
      this.options.globalVariables.has(identifierName)
    ) {
      return;
    }

    if (object.$renamed) {
      return;
    }

    var info = getIdentifierInfo(object, parents);

    if (info.spec.isExported) {
      return;
    }

    if (!info.spec.isReferenced) {
      return;
    }

    var contexts = [object, ...parents].filter((x) => isContext(x));
    var newName = null;

    // Function default parameter check!
    var functionIndices = [];
    for (var i in parents) {
      if (isFunction(parents[i])) {
        functionIndices.push(i);
      }
    }

    for (var functionIndex of functionIndices) {
      if (parents[functionIndex].id === object) {
        // This context is not referenced, so remove it
        contexts = contexts.filter(
          (context) => context != parents[functionIndex]
        );
        continue;
      }
      if (parents[functionIndex].params === parents[functionIndex - 1]) {
        var isReferencedHere = true;

        var slicedParents = parents.slice(0, functionIndex);
        var forIndex = 0;
        for (var parent of slicedParents) {
          var childNode = slicedParents[forIndex - 1] || object;

          if (
            parent.type === "AssignmentPattern" &&
            parent.right === childNode
          ) {
            isReferencedHere = false;
            break;
          }

          forIndex++;
        }

        if (!isReferencedHere) {
          // This context is not referenced, so remove it
          contexts = contexts.filter(
            (context) => context != parents[functionIndex]
          );
        }
      }
    }

    for (var check of contexts) {
      if (
        this.variableAnalysis.defined.has(check) &&
        this.variableAnalysis.defined.get(check).has(identifierName)
      ) {
        if (
          this.changed.has(check) &&
          this.changed.get(check)[identifierName]
        ) {
          newName = this.changed.get(check)[identifierName];
          break;
        }
      }
    }

    if (newName && typeof newName === "string") {
      // Strange behavior where the `local` and `imported` objects are the same
      if (info.isImportSpecifier) {
        var importSpecifierIndex = parents.findIndex(
          (x) => x.type === "ImportSpecifier"
        );
        if (
          importSpecifierIndex != -1 &&
          parents[importSpecifierIndex].imported ===
            (parents[importSpecifierIndex - 1] || object) &&
          parents[importSpecifierIndex].imported &&
          parents[importSpecifierIndex].imported.type === "Identifier"
        ) {
          parents[importSpecifierIndex].imported = clone(
            parents[importSpecifierIndex - 1] || object
          );
        }
      }

      // console.log(o.name, "->", newName);
      // 5. Update Identifier node's 'name' property
      object.name = newName;
      object.$renamed = true;
    }
  }

  transform(object: Node, parents: Node[]) {
    var matchType = object.type === "Identifier" ? "Identifier" : "Context";
    if (matchType === "Identifier") {
      this.transformIdentifier(object, parents);
    } else {
      this.transformContext(object, parents);
    }
  }
}
