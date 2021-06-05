import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { walk } from "../../traverse";
import { Location, Node } from "../../util/gen";
import { getIdentifierInfo } from "../../util/identifiers";
import {
  getVarContext,
  isVarContext,
  getLexContext,
  isContext,
  isLexContext,
  getDefiningContext,
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
   */
  defined: Map<Node, Set<string>>;
  references: Map<Node, Set<string>>;

  constructor(o) {
    super(o);

    this.defined = new Map();
    this.references = new Map();
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

        var info = getIdentifierInfo(o, p);
        if (!info.spec.isReferenced) {
          return;
        }

        if (info.spec.isExported) {
          return;
        }

        var definingContexts = info.spec.isDefined
          ? [getDefiningContext(o, p)]
          : [getVarContext(o, p), getLexContext(o, p)];

        ok(definingContexts.length);

        var isDefined = info.spec.isDefined;
        definingContexts.forEach((definingContext) => {
          ok(
            isContext(definingContext),
            `${definingContext.type} is not a context`
          );

          if (isDefined) {
            // Add to defined Map
            if (!this.defined.has(definingContext)) {
              this.defined.set(definingContext, new Set());
            }
            this.defined.get(definingContext).add(name);
            this.references.has(definingContext) &&
              this.references.get(definingContext).delete(name);
          } else {
            // Add to references Map
            if (
              !this.defined.has(definingContext) ||
              !this.defined.get(definingContext).has(name)
            ) {
              if (!this.references.has(definingContext)) {
                this.references.set(definingContext, new Set());
              }
              this.references.get(definingContext).add(name);
            }
          }
        });
      }
    });

    // console.log(isGlobal ? "<Global>" : object.id && object.id.name || "<FunctionExpression>", this.defined.get(object), this.references.get(object));
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

    if (!defined && !this.changed.has(object)) {
      this.changed.set(object, Object.create(null));
      return;
    }

    var possible = new Set();

    if (this.generated.length && !isGlobal) {
      var allReferences = new Set(references || []);
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
