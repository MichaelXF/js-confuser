import * as babelTypes from "@babel/types";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { NodePath } from "@babel/traverse";
import { ok } from "assert";

export interface TemplateVariables {
  [varName: string]:
    | string
    | number
    | (() => babelTypes.Node | babelTypes.Node[] | Template)
    | babelTypes.Node
    | babelTypes.Node[]
    | Template;
}

export default class Template {
  private templates: string[];
  private defaultVariables: TemplateVariables;
  private requiredVariables: Set<string>;

  constructor(...templates: string[]) {
    this.templates = templates;
    this.defaultVariables = Object.create(null);
    this.requiredVariables = new Set<string>();

    this.findRequiredVariables();
  }

  setDefaultVariables(defaultVariables: TemplateVariables): this {
    this.defaultVariables = defaultVariables;
    return this;
  }

  private findRequiredVariables() {
    const matches = this.templates[0].match(/{[$A-Za-z0-9_]+}/g);
    if (matches !== null) {
      matches.forEach((variable) => {
        const name = variable.slice(1, -1);

        // $ variables are for default variables
        if (name.startsWith("$")) {
          this.defaultVariables[name] = `td_${
            Object.keys(this.defaultVariables).length
          }`;
        } else {
          this.requiredVariables.add(name);
        }
      });
    }
  }

  private interpolateTemplate(variables: TemplateVariables = {}) {
    const allVariables = { ...this.defaultVariables, ...variables };

    for (const requiredVariable of this.requiredVariables) {
      if (typeof allVariables[requiredVariable] === "undefined") {
        throw new Error(
          `${
            this.templates[0]
          } missing variable: ${requiredVariable} from ${JSON.stringify(
            allVariables
          )}`
        );
      }
    }

    const template =
      this.templates[Math.floor(Math.random() * this.templates.length)];
    let output = template;

    Object.keys(allVariables).forEach((name) => {
      const bracketName = `{${name.replace("$", "\\$")}}`;
      let value = allVariables[name] as string;

      if (this.isASTVariable(value)) {
        value = name;
      }

      const reg = new RegExp(bracketName, "g");
      output = output.replace(reg, value);
    });

    return { output, template };
  }

  private isASTVariable(variable: any): boolean {
    return typeof variable !== "string" && typeof variable !== "number";
  }

  private interpolateAST(ast: babelTypes.Node, variables: TemplateVariables) {
    const allVariables = { ...this.defaultVariables, ...variables };

    const astNames = new Set(
      Object.keys(allVariables).filter((name) => {
        return this.isASTVariable(allVariables[name]);
      })
    );

    if (astNames.size === 0) return;

    traverse(ast, {
      Identifier(path: NodePath<babelTypes.Identifier>) {
        const name = path.node.name;
        if (allVariables[name]) {
          let value = allVariables[name];
          if (typeof value === "function") {
            value = value();
          }

          if (value instanceof Template) {
            value = value.compile(allVariables);
          }

          if (!Array.isArray(value)) {
            path.replaceWith(value as babelTypes.Node);
          } else {
            path.replaceWithMultiple(value as babelTypes.Node[]);
          }
        }
      },
    });
  }

  compile(variables: TemplateVariables = {}): babelTypes.Statement[] {
    const { output } = this.interpolateTemplate(variables);

    let file: babelTypes.File;
    try {
      file = parse(output, { sourceType: "module" });
    } catch (e) {
      throw new Error(
        output + "\n" + "Template failed to parse: " + (e as Error).message
      );
    }

    this.interpolateAST(file, variables);

    return file.program.body;
  }

  single<T extends babelTypes.Node = babelTypes.Statement>(
    variables: TemplateVariables = {}
  ): T {
    const nodes = this.compile(variables);

    if (nodes.length !== 1) {
      const filteredNodes = nodes.filter(
        (node) => node.type !== "EmptyStatement"
      );
      ok(
        filteredNodes.length === 1,
        `Expected single node, got ${filteredNodes
          .map((node) => node.type)
          .join(", ")}`
      );
      return filteredNodes[0] as T;
    }

    return nodes[0] as T;
  }

  expression(variables: TemplateVariables = {}): babelTypes.Expression {
    const statement = this.single(variables);

    babelTypes.assertExpressionStatement(statement);

    return statement.expression;
  }
}
