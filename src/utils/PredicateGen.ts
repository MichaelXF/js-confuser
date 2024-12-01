import { NodePath } from "@babel/traverse";
import { PluginInstance } from "../transforms/plugin";
import * as t from "@babel/types";
import { prepend } from "./ast-utils";
import { NameGen } from "./NameGen";
import Template from "../templates/template";

export default class PredicateGen {
  constructor(public plugin: PluginInstance) {}

  dummyFunctionName: string | null = null;
  programPath: NodePath<t.Program> | null = null;

  ensureCreated() {
    if (this.dummyFunctionName) return;

    this.dummyFunctionName = this.plugin.getPlaceholder("dummyFunction");

    // Insert dummy function
    prepend(
      this.programPath,

      this.plugin.skip(
        t.functionDeclaration(
          t.identifier(this.dummyFunctionName),
          [],
          t.blockStatement([])
        )
      )
    );
  }

  generateTrueExpression(path: NodePath): t.Expression {
    return t.unaryExpression("!", this.generateFalseExpression(path));
  }

  generateFalseExpression(path: NodePath): t.Expression {
    this.programPath = path.find((p) => p.isProgram()) as NodePath<t.Program>;
    this.ensureCreated();

    // Overcomplicated way to get a random property name that doesn't exist on the Function
    var randomProperty: string;
    var nameGen = new NameGen("randomized");

    function PrototypeCollision() {}
    PrototypeCollision(); // Call it for code coverage :D

    do {
      randomProperty = nameGen.generate();
    } while (
      !randomProperty ||
      PrototypeCollision[randomProperty] !== undefined
    );

    return this.plugin.skip(
      new Template(
        `"${randomProperty}" in ${this.dummyFunctionName}`
      ).expression()
    );
  }
}
