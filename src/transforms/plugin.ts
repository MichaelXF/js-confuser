import { NodePath, Visitor } from "@babel/traverse";
import Obfuscator from "../obfuscator";
import { getRandomString } from "../utils/random-utils";
import { Order } from "../order";
import * as t from "@babel/types";
import { FN_LENGTH, NodeSymbol, SKIP } from "../constants";
import { SetFunctionLengthTemplate } from "../templates/setFunctionLengthTemplate";
import { prepend, prependProgram } from "../utils/ast-utils";
import { numericLiteral } from "../utils/node";

export interface PluginObject {
  visitor?: Visitor;
  finalASTHandler?: (ast: t.File) => t.File;

  post?: () => void;
}

export type PluginArg = {
  Plugin: <T extends Partial<PluginInstance> = {}>(
    order: Order,
    merge?: T
  ) => PluginInstance & T;
};

export type PluginFunction = (pluginArg: PluginArg) => PluginObject;

export class PluginInstance {
  constructor(
    public pluginOptions: { name?: string; order?: number },
    public obfuscator: Obfuscator
  ) {
    this.computeProbabilityMap = obfuscator.computeProbabilityMap.bind(
      this.obfuscator
    );
  }

  public changeData: { [key: string]: number } = {};
  public computeProbabilityMap: Obfuscator["computeProbabilityMap"];

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

  skip<T extends t.Node>(path: NodePath<T> | T | NodePath<T>[]): T {
    if (Array.isArray(path)) {
      path.forEach((p) => this.skip(p));
    } else {
      let any = path as any;
      let node = any.isNodeType ? any.node : any;

      (node as NodeSymbol)[SKIP] = this.order;

      return node;
    }
  }

  /**
   * Returns `true` if the given path has been skipped by this plugin.
   */
  isSkipped(path: NodePath) {
    return (path.node as NodeSymbol)[SKIP] === this.order;
  }

  private setFunctionLengthName: string;
  setFunctionLength(path: NodePath<t.Function>, originalLength: number) {
    (path.node as NodeSymbol)[FN_LENGTH] = originalLength;

    // Skip if user disabled this feature
    if (!this.options.preserveFunctionLength) return;

    // Skip if function has no parameters
    if (originalLength === 0) return;

    // Create the function length setter if it doesn't exist
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

    const createCallArguments = (node: t.Expression): t.Expression[] => {
      var args = [node];

      // 1 is the default value in the setFunction template, can exclude it
      if (originalLength !== 1) {
        args.push(numericLiteral(originalLength));
      }
      return args;
    };

    if (t.isFunctionDeclaration(path.node)) {
      prepend(
        path.parentPath,
        t.expressionStatement(
          t.callExpression(
            t.identifier(this.setFunctionLengthName),
            createCallArguments(t.identifier(path.node.id.name))
          )
        )
      );
    } else if (
      t.isFunctionExpression(path.node) ||
      t.isArrowFunctionExpression(path.node)
    ) {
      path.replaceWith(
        t.callExpression(
          t.identifier(this.setFunctionLengthName),
          createCallArguments(path.node)
        )
      );
    } else {
      // TODO
    }
  }

  /**
   * Returns a random string.
   *
   * Used for creating temporary variables names, typically before RenameVariables has ran.
   *
   * These long temp names will be converted to short, mangled names by RenameVariables.
   */
  getPlaceholder(suffix = "") {
    return "__p_" + getRandomString(4) + (suffix ? "_" + suffix : "");
  }

  /**
   * Logs a message to the console, only if `verbose` is enabled.
   * @param messages
   */
  log(...messages: any[]) {
    if (this.options.verbose) {
      console.log(`[${this.name}]`, ...messages);
    }
  }

  /**
   * Logs a warning to the console, only if `verbose` is enabled.
   * @param messages
   */
  warn(...messages: any[]) {
    if (this.options.verbose) {
      console.log(`WARN [${this.name}]`, ...messages);
    }
  }

  /**
   * Throws an error with the given message.
   * @param messages
   */
  error(...messages: any[]): never {
    throw new Error(`[${this.name}] ${messages.join(" ")}`);
  }
}
