import Transform from "../transform";
import { Node, Literal, BinaryExpression } from "../../util/gen";
import { clone } from "../../util/insert";
import { shuffle, splitIntoChunks } from "../../util/random";
import { ObfuscateOrder } from "../../order";
import { isModuleSource } from "./stringConcealing";
import { isDirective } from "../../util/compare";
import { ok } from "assert";

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

  apply(tree) {
    super.apply(tree);

    if (this.vars.length) {
      shuffle(this.adders);
      shuffle(this.vars);

      var body: Node[] = tree.body;

      this.adders.forEach((nodes) => {
        nodes.forEach((x) => body.unshift(x));
      });

      var variableDeclaration = {
        type: "VariableDeclaration",
        declarations: [],
        kind: "var",
      };
      this.vars.forEach((node) => variableDeclaration.declarations.push(node));

      body.unshift(variableDeclaration);
    }
  }

  match(object: Node, parents: Node[]) {
    return (
      object.type == "Literal" &&
      typeof object.value === "string" &&
      !isModuleSource(object, parents) &&
      !isDirective(object, parents)
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      var propIndex = parents.findIndex((x) => x.type == "Property");
      if (propIndex !== -1 && parents[propIndex].key == object) {
        parents[propIndex].computed = true;
      }

      var chunks = splitIntoChunks(object.value);
      if (!chunks || chunks.length <= 1) {
        return;
      }

      var binaryExpression;
      var parent;
      var last = chunks.pop();
      chunks.forEach((chunk, i) => {
        if (i == 0) {
          ok(i == 0);
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

      this.replace(object, parent);
    };
  }
}
