import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { walk } from "../../traverse";
import { Location, Node } from "../../util/gen";
import { getIdentifierInfo } from "../../util/identifiers";
import {
  getContext,
  isContext,
  isFunction,
  isInBranch,
} from "../../util/insert";
import { isValidIdentifier } from "../../util/compare";
import Transform from "../transform";
import { reservedIdentifiers } from "../../constants";

/**
 * Keeps track of what identifiers are defined and referenced in each context.
 */
export class VariableAnalysis extends Transform {
  /**
   * Node being the context.
   *
   * A context is:
   * - Program (global context, the root node)
   * - or Function
   */
  defined: Map<Node, Set<string>>;
  references: Map<Node, Set<string>>;
  nodes: Map<Node, Set<Location>>;
  checkBranch: boolean;

  constructor(o, checkBranch = false) {
    super(o);

    this.defined = new Map();
    this.references = new Map();
    this.nodes = new Map();
    this.checkBranch = !!checkBranch;
  }

  match(object, parents) {
    return isContext(object);
  }

  transform(object, parents) {
    walk(object, parents, (o, p) => {
      if (o.type == "Identifier") {
        var name = o.name;
        ok(typeof name === "string");
        if (!isValidIdentifier(name)) {
          return;
        }

        if (reservedIdentifiers.has(name)) {
          return;
        }
        if (this.options.globalVariables.has(name)) {
          return;
        }

        var c = getContext(o, p);
        var info = getIdentifierInfo(o, p);
        if (!info.spec.isReferenced) {
          return;
        }

        if (info.spec.isExported) {
          return;
        }

        // Since a function's `.id` is nested within the function(i.e a new context)
        // we must go one context up
        if (info.isFunctionDeclaration) {
          var fnIndex = p.findIndex((x) => isFunction(x));
          c = p.slice(fnIndex + 1).find((x) => isContext(x));
        }

        ok(isContext(c), `${c.type} is not a context`);

        // Add to nodes array (its actually a set)
        if (object.type == "Program") {
          if (!this.nodes.has(c)) {
            this.nodes.set(c, new Set());
          }
          this.nodes.get(c).add([o, p]);
        }

        var isDefined = info.spec.isDefined;

        if (this.checkBranch) {
          var isBranch = isInBranch(o, p, c);
          if (isBranch) {
            isDefined = false;
          }
        }

        if (isDefined) {
          // Add to defined Map
          if (!this.defined.has(c)) {
            this.defined.set(c, new Set());
          }
          this.defined.get(c).add(name);
          this.references.has(c) && this.references.get(c).delete(name);
        } else {
          // Add to references Map
          if (!this.defined.has(c) || !this.defined.get(c).has(name)) {
            if (!this.references.has(c)) {
              this.references.set(c, new Set());
            }
            this.references.get(c).add(name);
          }
        }
      }
    });

    // console.log(isGlobal ? "<Global>" : object.id && object.id.name || "<FunctionExpression>", this.defined.get(object), this.references.get(object));

    if (!this.defined.has(object)) {
      this.defined.set(object, new Set());
    }
    if (!this.references.has(object)) {
      this.references.set(object, new Set());
    }
  }
}

/**
 * Rename variables to randomly generated names.
 *
 * - Attempts to re-use already generated names in nested scopes.
 */
export default class RenameVariables extends Transform {
  // Generator object
  gen: any;

  // Names already used
  generated: string[];

  // Map of Context->Object of changes
  changed: Map<Node, { [name: string]: string }>;

  // Ref to VariableAnalysis data
  variableAnalysis: VariableAnalysis;

  constructor(o) {
    super(o, ObfuscateOrder.RenameVariables);

    this.changed = new Map();
    this.before.push((this.variableAnalysis = new VariableAnalysis(o)));
    this.gen = this.getGenerator();
    this.generated = [];
  }

  match(object, parents) {
    return isContext(object);
  }

  transform(object, parents) {
    var isGlobal = object.type == "Program";

    var newNames = Object.create(null);

    var defined = this.variableAnalysis.defined.get(object);
    var references = this.variableAnalysis.references.get(object);

    if (!defined && !this.changed.has(object)) {
      this.changed.set(object, Object.create(null));
      return;
    }

    var possible = new Set();

    if (this.generated.length && !isGlobal) {
      var allReferences = new Set(references || []);
      var nope = new Set(defined);
      walk(object, [], (o, p) => {
        if (isContext(o)) {
          var ref = this.variableAnalysis.references.get(o);
          if (ref) {
            ref.forEach((x) => allReferences.add(x));
          }

          var def = this.variableAnalysis.defined.get(o);
          if (def) {
            def.forEach((x) => allReferences.add(x));
          }
        }
      });

      var passed = new Set();
      parents.forEach((p) => {
        var changes = this.changed.get(p);
        if (changes) {
          Object.keys(changes).forEach((x) => {
            var name = changes[x];

            if (!allReferences.has(x)) {
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

    defined.forEach((name) => {
      if (possible.size) {
        var first = possible.values().next().value;
        possible.delete(first);
        newNames[name] = first;
      } else {
        // Fix 1. Use `generateIdentifier` over `gen.generate()` so Integrity can get unique variable names
        var g = this.generateIdentifier();
        newNames[name] = g;
        this.generated.push(g);
      }
    });

    this.changed.set(object, newNames);

    walk(object, parents, (o, p) => {
      if (o.type == "Identifier") {
        if (
          reservedIdentifiers.has(o.name) ||
          this.options.globalVariables.has(o.name)
        ) {
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

        if (newName) {
          if (o.$renamed) {
            return;
          }

          // console.log(o.name, "->", newName);
          o.name = newName;
          o.$renamed = true;
        }
      }
    });
  }
}
