import Transform from "../transform";
import { Node, Literal, BinaryExpression } from "../../util/gen";
import { clone } from "../../util/insert";
import { getRandomInteger, shuffle, splitIntoChunks } from "../../util/random";
import { ObfuscateOrder } from "../../order";
import { isDirective, isModuleSource } from "../../util/compare";
import { ok } from "assert";
import { ComputeProbabilityMap } from "../../probability";

export default class StringSplitting extends Transform {
  joinPrototype: string;
  strings: { [value: string]: string };

  adders: Node[][];
  vars: Node[];

  constructor(o) {
    super(o, ObfuscateOrder.StringSplitting);

    this.joinPrototype = null;
    this.strings = Object.create(null);

    this.adders = [];
    this.vars = [];
  }

  match(object: Node, parents: Node[]) {
    return (
      object.type == "Literal" &&
      typeof object.value === "string" &&
      object.value.length >= 8 &&
      !isModuleSource(object, parents) &&
      !isDirective(object, parents)
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var size = Math.round(
        Math.max(6, object.value.length / getRandomInteger(3, 8))
      );
      if (object.value.length <= size) {
        return;
      }

      var chunks = splitIntoChunks(object.value, size);
      if (!chunks || chunks.length <= 1) {
        return;
      }

      if (
        !ComputeProbabilityMap(
          this.options.stringSplitting,
          (x) => x,
          object.value
        )
      ) {
        return;
      }

      var binaryExpression;
      var parent;
      var last = chunks.pop();
      chunks.forEach((chunk, i) => {
        if (i == 0) {
          parent = binaryExpression = BinaryExpression(
            "+",
            Literal(chunk),
            Literal("")
          );
        } else {
          binaryExpression.left = BinaryExpression(
            "+",
            clone(binaryExpression.left),
            Literal(chunk)
          );
          ok(binaryExpression);
        }
      });

      parent.right = Literal(last);

      this.replaceIdentifierOrLiteral(object, parent, parents);
    };
  }
}
