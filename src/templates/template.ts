import * as babelTypes from "@babel/types";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { NodePath } from "@babel/traverse";
import { ok } from "assert";
import { getRandomString } from "../utils/random-utils";
import { NodeSymbol } from "../constants";

// Create a union type of the symbol keys in NodeSymbol
type NodeSymbolKeys = keyof {
  [K in keyof NodeSymbol as K extends symbol ? K : never]: NodeSymbol[K];
};

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
  private astVariableMappings: Map<string, string>;
  private astIdentifierPrefix = "__t_" + getRandomString(6);
  private symbols = new Set<NodeSymbolKeys>();

  constructor(...templates: string[]) {
    this.templates = templates;
    this.defaultVariables = Object.create(null);
    this.requiredVariables = new Set<string>();

    this.findRequiredVariables();
  }

  addSymbols(...symbols: NodeSymbolKeys[]): this {
    symbols.forEach((symbol) => {
      this.symbols.add(symbol);
    });
    return this;
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

        this.requiredVariables.add(name);
      });
    }
  }

  private interpolateTemplate(variables: TemplateVariables) {
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

    this.astVariableMappings = new Map();

    Object.keys(allVariables).forEach((name) => {
      const bracketName = `{${name.replace("$", "\\$")}}`;
      let value = allVariables[name] as string;

      if (this.isASTVariable(value)) {
        let astIdentifierName = this.astIdentifierPrefix + name;
        this.astVariableMappings.set(name, astIdentifierName);

        value = astIdentifierName;
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
    if (this.astVariableMappings.size === 0) return;

    const allVariables = { ...this.defaultVariables, ...variables };
    const template = this;

    // Reverse the lookup map
    // Before {name -> __t_m4H6nk_name}
    // After {__t_m4H6nk_name -> name}
    const reverseMappings = new Map<string, string>();
    this.astVariableMappings.forEach((value, key) => {
      reverseMappings.set(value, key);
    });

    const insertedVariables = new Set<string>();

    traverse(ast, {
      Identifier(path: NodePath<babelTypes.Identifier>) {
        const idName = path.node.name;
        if (!idName.startsWith(template.astIdentifierPrefix)) return;

        const variableName = reverseMappings.get(idName);
        ok(variableName, `Variable ${idName} not found in mappings`);

        let value = allVariables[variableName];
        let isSingleUse = true; // Hard-coded nodes are deemed 'single use'
        if (typeof value === "function") {
          value = value();
          isSingleUse = false;
        }

        if (value instanceof Template) {
          value = value.compile(allVariables);
          isSingleUse = false;
        }

        // Duplicate node check
        if (isSingleUse) {
          if (insertedVariables.has(variableName)) {
            ok(false, "Duplicate node inserted for variable: " + variableName);
          }
          insertedVariables.add(variableName);
        }

        // Insert new nodes
        if (!Array.isArray(value)) {
          path.replaceWith(value as babelTypes.Node);
        } else {
          path.replaceWithMultiple(value as babelTypes.Node[]);
        }

        path.skip();
      },
    });
  }

  file(variables: TemplateVariables = {}): babelTypes.File {
    const { output } = this.interpolateTemplate(variables);

    let file: babelTypes.File;
    try {
      file = parse(output, {
        sourceType: "module",
        allowReturnOutsideFunction: true,
      });
    } catch (e) {
      throw new Error(
        output + "\n" + "Template failed to parse: " + (e as Error).message
      );
    }

    this.interpolateAST(file, variables);

    if (this.symbols.size > 0) {
      file.program.body.forEach((node) => {
        for (const symbol of this.symbols) {
          node[symbol] = true;
        }
      });
    }

    return file;
  }

  compile(variables: TemplateVariables = {}): babelTypes.Statement[] {
    const file = this.file(variables);

    return file.program.body;
  }

  single<T extends babelTypes.Statement>(variables: TemplateVariables = {}): T {
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

  expression<T extends babelTypes.Expression>(
    variables: TemplateVariables = {}
  ): T {
    const statement = this.single(variables);

    babelTypes.assertExpressionStatement(statement);

    return statement.expression as T;
  }
}
