import { NodePath, PluginObj } from "@babel/core";
import Obfuscator from "../obfuscator";
import { chance, choice, getRandomString } from "../utils/random-utils";
import { Order } from "../order";
import * as t from "@babel/types";
import { FN_LENGTH, NodeSymbol, SKIP, CONTROL_OBJECTS } from "../constants";
import { SetFunctionLengthTemplate } from "../templates/setFunctionLengthTemplate";
import { prepend, prependProgram } from "../utils/ast-utils";
import ControlObject from "../utils/ControlObject";
import { ok } from "assert";

export type PluginFunction = (pluginArg: PluginArg) => PluginObj;

export type PluginArg = {
  Plugin: (order: Order) => PluginInstance;
};

export class PluginInstance {
  constructor(
    public pluginOptions: { name?: string; order?: number },
    public obfuscator: Obfuscator
  ) {}

  get name() {
    return this.pluginOptions.name || "unnamed";
  }

  get order() {
    return this.pluginOptions.order;
  }

  get options() {
    return this.obfuscator.options;
  }

  get globalState() {
    return this.obfuscator.globalState;
  }

  skip(path: NodePath | t.Node | NodePath[]) {
    if (Array.isArray(path)) {
      path.forEach((p) => this.skip(p));
    } else {
      let any = path as any;
      let node = any.isNodeType ? any.node : any;

      (node as NodeSymbol)[SKIP] = this.order;
    }
  }

  isSkipped(path: NodePath | t.Node) {
    let any = path as any;
    let node = any.isNodeType ? any.node : any;

    return (node as NodeSymbol)[SKIP] === this.order;
  }

  private setFunctionLengthName: string;
  setFunctionLength(path: NodePath<t.Function>, originalLength: number) {
    (path.node as NodeSymbol)[FN_LENGTH] = originalLength;

    // Function length
    if (this.options.preserveFunctionLength && originalLength > 0) {
      if (!this.setFunctionLengthName) {
        this.setFunctionLengthName = this.getPlaceholder("fnLength");

        this.skip(
          prependProgram(
            path,
            SetFunctionLengthTemplate.compile({
              fnName: this.setFunctionLengthName,
            })
          )
        );
      }
      if (t.isFunctionDeclaration(path.node)) {
        prepend(
          path.parentPath,
          t.expressionStatement(
            t.callExpression(t.identifier(this.setFunctionLengthName), [
              t.identifier(path.node.id.name),
              t.numericLiteral(originalLength),
            ])
          )
        );
      } else if (
        t.isFunctionExpression(path.node) ||
        t.isArrowFunctionExpression(path.node)
      ) {
        path.replaceWith(
          t.callExpression(t.identifier(this.setFunctionLengthName), [
            path.node,
            t.numericLiteral(originalLength),
          ])
        );
      } else {
        // TODO
      }
    }
  }

  getPlaceholder(suffix = "") {
    return "__p_" + getRandomString(4) + (suffix ? "_" + suffix : "");
  }

  generateRandomIdentifier() {
    return "_" + getRandomString(6);
  }

  log(...messages: any[]) {
    if (this.options.verbose) {
      console.log(`[${this.name}]`, ...messages);
    }
  }

  getControlObject(blockPath: NodePath<t.Block>) {
    ok(blockPath.isBlock());

    var controlObjects = (blockPath.node as NodeSymbol)[CONTROL_OBJECTS];
    if (!controlObjects) {
      controlObjects = [];
    }

    if (
      controlObjects.length === 0 ||
      chance(100 - controlObjects.length * 10)
    ) {
      var newControlObject = new ControlObject(this, blockPath);

      controlObjects.push(newControlObject);

      (blockPath.node as NodeSymbol)[CONTROL_OBJECTS] = controlObjects;

      return newControlObject;
    }

    return choice(controlObjects);
  }

  warn(...messages: any[]) {
    if (this.options.verbose) {
      console.log(`WARN [${this.name}]`, ...messages);
    }
  }

  error(...messages: any[]): never {
    throw new Error(`[${this.name}] ${messages.join(", ")}`);
  }
}
