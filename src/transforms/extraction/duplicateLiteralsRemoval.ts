import Transform from "../transform";
import {
  Identifier,
  Literal,
  VariableDeclaration,
  Node,
  ArrayExpression,
  MemberExpression,
  VariableDeclarator,
  Location,
} from "../../util/gen";
import { clone, prepend } from "../../util/insert";
import { isDirective, isPrimitive } from "../../util/compare";

import { ObfuscateOrder } from "../../order";
import { isModuleSource } from "../string/stringConcealing";
import { ComputeProbabilityMap } from "../../probability";
import { ok } from "assert";

/**
 * [Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a variable name.
 *
 * - Potency Medium
 * - Resilience Medium
 * - Cost Medium
 *
 * ```js
 * // Input
 * var foo = "http://www.example.xyz";
 * bar("http://www.example.xyz");
 *
 * // Output
 * var a = "http://www.example.xyz";
 * var foo = a;
 * bar(a);
 * ```
 */
export default class DuplicateLiteralsRemoval extends Transform {
  arrayName: string;
  arrayExpression: Node;
  map: Map<string, number>;
  first: Map<string, Location | null>;

  constructor(o) {
    super(o, ObfuscateOrder.DuplicateLiteralsRemoval);

    this.map = new Map();
    this.first = new Map();
  }

  match(object: Node, parents: Node[]) {
    return (
      isPrimitive(object) &&
      !isDirective(object, parents) &&
      !isModuleSource(object, parents) &&
      !parents.find((x) => x.$dispatcherSkip)
    );
  }

  toMember(object: Node, parents: Node[], index: number) {
    this.replace(
      object,
      MemberExpression(Identifier(this.arrayName), Literal(index), true)
    );

    var propertyIndex = parents.findIndex((x) => x.type == "Property");
    if (propertyIndex != -1) {
      if (
        !parents[propertyIndex].computed &&
        parents[propertyIndex].key == (parents[propertyIndex - 1] || object)
      ) {
        parents[propertyIndex].computed = true;
      }
    }
  }

  transform(object: Node, parents: Node[]) {
    var value = object.value;
    if (object.regex) {
      return;
    }

    if (!ComputeProbabilityMap(this.options.duplicateLiteralsRemoval)) {
      return;
    }

    if (
      this.arrayName &&
      parents[0].object &&
      parents[0].object.name == this.arrayName
    ) {
      return;
    }

    var value;
    if (object.type == "Literal") {
      value = typeof object.value + ":" + object.value;

      if (!object.value) {
        return;
      }
    } else if (object.type == "Identifier") {
      value = "identifier:" + object.name;
    } else {
      throw new Error("Unsupported primitive type: " + object.type);
    }

    ok(value);

    if (!this.first.has(value) && !this.map.has(value)) {
      this.first.set(value, [object, parents]);
    } else {
      if (!this.arrayName) {
        this.arrayName = this.getPlaceholder();
        this.arrayExpression = ArrayExpression([]);

        prepend(
          parents[parents.length - 1] || object,
          VariableDeclaration(
            VariableDeclarator(this.arrayName, this.arrayExpression)
          )
        );
      }

      var first = this.first.get(value);
      if (first) {
        this.first.set(value, null);
        var index = this.map.size;

        ok(!this.map.has(value));
        this.map.set(value, index);

        this.toMember(first[0], first[1], index);

        var pushing = clone(object);
        this.arrayExpression.elements.push(pushing);

        ok(this.arrayExpression.elements[index] === pushing);
      }

      var index = this.map.get(value);
      ok(typeof index === "number");

      this.toMember(object, parents, index);
    }
  }
}
