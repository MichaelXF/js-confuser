import Transform from "../transform";
import {
  Node,
  AssignmentExpression,
  MemberExpression,
  Identifier,
  Literal,
  FunctionExpression,
  ReturnStatement,
  CallExpression,
  ArrayExpression,
  ExpressionStatement,
  ThisExpression,
} from "../../util/gen";
import { prepend } from "../../util/insert";
import { shuffle, splitIntoChunks } from "../../util/random";
import { ObfuscateOrder } from "../../order";
import { isModuleSource } from "./stringConcealing";
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
      !isModuleSource(object, parents)
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (!object.value) {
        return;
      }
      var chunks = splitIntoChunks(object.value, 5, 25);

      var propIndex = parents.findIndex((x) => x.type == "Property");
      if (propIndex != -1) {
        if (parents[propIndex].key == (parents[propIndex - 1] || object)) {
          parents[propIndex].computed = true;
        }
      }

      if (this.strings[object.value]) {
        this.replace(object, Identifier(this.strings[object.value]));
        return;
      }

      if (
        chunks.length >= 2 &&
        chunks[1].length > 2 &&
        ComputeProbabilityMap(
          this.options.stringSplitting,
          (x) => x,
          object.value
        )
      ) {
        this.log(
          `'${object.value}' -> ${chunks.map((x) => `'${x}'`).join(" + ")}`
        );

        if (Math.random() > 0.5) {
          // use .join instead

          if (!this.joinPrototype) {
            this.joinPrototype = this.generateIdentifier();

            var assignment = AssignmentExpression(
              "=",
              MemberExpression(
                MemberExpression(Identifier("Array"), Literal("prototype")),
                Identifier(this.joinPrototype),
                false
              ),
              FunctionExpression(
                [],
                [
                  ReturnStatement(
                    CallExpression(
                      MemberExpression(ThisExpression(), Literal("join")),
                      [Literal("")]
                    )
                  ),
                ]
              )
            );
            prepend(
              parents[parents.length - 1],
              ExpressionStatement(assignment)
            );
          }

          var arrayExpression = ArrayExpression(chunks.map(Literal));

          this.replace(
            object,
            CallExpression(
              MemberExpression(arrayExpression, Literal(this.joinPrototype)),
              []
            )
          );
        } else {
          var newVar = this.getPlaceholder();

          var adders = chunks
            .slice(1)
            .reverse()
            .map((x) => {
              return ExpressionStatement(
                AssignmentExpression("+=", Identifier(newVar), Literal(x))
              );
            });

          this.adders.push(adders);
          this.vars.push({
            type: "VariableDeclarator",
            id: Identifier(newVar),
            init: Literal(chunks[0]),
          });
          this.strings[object.value] = newVar;

          this.objectAssign(object, Identifier(newVar));
        }
      }
    };
  }
}
