import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { PluginInstance } from "../transforms/plugin";
import { NameGen } from "./NameGen";
import { prepend } from "./ast-utils";
import { chance, choice } from "./random-utils";

/**
 * A Control Object is an object that is used to store properties that are used in multiple places.
 */
export default class ControlObject {
  propertyNames = new Set<string>();
  nameGen: NameGen;
  objectName: string | null = null;
  objectPath: NodePath<t.Declaration> | null = null;
  objectExpression: t.ObjectExpression | null = null;

  constructor(public me: PluginInstance, public blockPath: NodePath<t.Block>) {
    this.nameGen = new NameGen(me.options.identifierGenerator, {
      avoidReserved: true,
      avoidObjectPrototype: true,
    });
  }

  createMemberExpression(propertyName: string): t.MemberExpression {
    return t.memberExpression(
      t.identifier(this.objectName),
      t.stringLiteral(propertyName),
      true
    );
  }

  createPredicate() {
    this.ensureCreated();

    var propertyName = choice(Array.from(this.propertyNames));
    if (!propertyName || chance(50)) {
      propertyName = this.nameGen.generate();
    }

    return {
      node: t.binaryExpression(
        "in",
        t.stringLiteral(propertyName),
        t.identifier(this.objectName)
      ),
      value: this.propertyNames.has(propertyName),
    };
  }

  createTruePredicate() {
    var { node, value } = this.createPredicate();
    if (value) {
      return node;
    }
    return t.unaryExpression("!", node);
  }

  createFalsePredicate() {
    var { node, value } = this.createPredicate();
    if (!value) {
      return node;
    }
    return t.unaryExpression("!", node);
  }

  private ensureCreated(node?: t.Node) {
    if (!this.objectName) {
      // Object hasn't been created yet
      this.objectName = this.me.getPlaceholder() + "_controlObject";

      if (node && t.isFunctionExpression(node) && !node.id) {
        // Use function declaration as object

        let newNode: t.FunctionDeclaration = node as any;
        newNode.type = "FunctionDeclaration";
        newNode.id = t.identifier(this.objectName);

        let newPath = prepend(
          this.blockPath,
          newNode
        )[0] as NodePath<t.FunctionDeclaration>;
        this.me.skip(newPath);

        this.objectPath = newPath;

        return t.identifier(this.objectName);
      } else {
        // Create plain object
        let newPath = prepend(
          this.blockPath,
          t.variableDeclaration("var", [
            t.variableDeclarator(
              t.identifier(this.objectName),
              t.objectExpression([])
            ),
          ])
        )[0] as NodePath<t.VariableDeclaration>;
        this.me.skip(newPath);

        this.objectPath = newPath;

        var objectExpression = newPath.node.declarations[0]
          .init as t.ObjectExpression;

        this.objectExpression = objectExpression;
        this.me.skip(this.objectExpression);
      }
    }
  }

  addProperty(node: t.Expression) {
    var initialNode = this.ensureCreated(node);
    if (initialNode) return initialNode;

    const propertyName = this.nameGen.generate();
    this.propertyNames.add(propertyName);

    // Add an initial property
    if (this.objectExpression) {
      this.objectExpression.properties.push(
        t.objectProperty(t.identifier(propertyName), node)
      );
    } else {
      // Add as assignment expression

      let assignment = t.assignmentExpression(
        "=",
        this.createMemberExpression(propertyName),
        node
      );

      var newPath = this.objectPath.insertAfter(
        t.expressionStatement(assignment)
      )[0];
      this.me.skip(newPath);
    }

    return this.createMemberExpression(propertyName);
  }
}
