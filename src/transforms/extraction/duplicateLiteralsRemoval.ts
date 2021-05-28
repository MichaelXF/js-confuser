import Transform from "../transform";
import {
  Identifier,
  Literal,
  VariableDeclaration,
  Node,
  ArrayExpression,
  MemberExpression,
  VariableDeclarator,
} from "../../util/gen";
import { prepend } from "../../util/insert";
import { ObfuscateOrder } from "../../order";
import { isModuleSource } from "../string/stringConcealing";
import { ComputeProbabilityMap } from "../../probability";

var primitiveIdentifiers = new Set(["undefined", "null", "NaN", "infinity"]);

function isPrimitive(node: Node) {
  if (node.type == "Literal") {
    return { number: 1, string: 1, boolean: 1 }[typeof node.value];
  } else if (node.type == "Identifier") {
    return primitiveIdentifiers.has(node.name);
  }

  return false;
}

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
  first: Map<string, Node[] | 0>;

  constructor(o) {
    super(o, ObfuscateOrder.DuplicateLiteralsRemoval);

    this.map = new Map();
    this.first = new Map();
  }

  match(object: Node, parents: Node[]) {
    return isPrimitive(object) && !isModuleSource(object, parents);
  }

  toMember(object: Node, parents: Node[], index: number) {
    this.replace(
      object,
      MemberExpression(Identifier(this.arrayName), Literal(index), true)
    );
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

    var propertyIndex = parents.findIndex((x) => x.type == "Property");
    if (propertyIndex != -1) {
      if (
        !parents[propertyIndex].computed &&
        parents[propertyIndex].key == (parents[propertyIndex - 1] || object)
      ) {
        parents[propertyIndex].computed = true;
      }
    }

    var value;
    if (object.type == "Literal") {
      value = typeof object.value + ":" + object.value;
    } else {
      value = "identifier:" + object.name;
    }

    if (!this.first.has(value)) {
      this.first.set(value, [object, ...parents]);
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
        this.first.set(value, 0);
        var index = this.map.size;
        this.map.set(value, index);

        this.toMember(first[0], first.slice(1), index);

        this.arrayExpression.elements.push({ ...object });
      }

      this.toMember(object, parents, this.map.get(value));
    }
  }
}
