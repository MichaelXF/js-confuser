import { Node } from "../util/gen";
import { parseSnippet, parseSync } from "../parser";
import { ok } from "assert";
import { choice } from "../util/random";
import { placeholderVariablePrefix } from "../constants";
import traverse from "../traverse";

export interface TemplateVariables {
  [varName: string]:
    | string
    | (() => Node | Node[] | Template)
    | Node
    | Node[]
    | Template;
}

/**
 * Templates provides an easy way to parse code snippets into AST subtrees.
 *
 * These AST subtrees can added to the obfuscated code, tailored with variable names.
 *
 * 1. Basic string interpolation
 *
 * ```js
 * var Base64Template = new Template(`
 * function {name}(str){
 *   return btoa(str)
 * }
 * `);
 *
 * var functionDeclaration = Base64Template.single({ name: "atob" });
 * ```
 *
 * 2. AST subtree insertion
 *
 * ```js
 * var Base64Template = new Template(`
 * function {name}(str){
 *   {getWindow}
 *
 *   return {getWindowName}btoa(str)
 * }`)
 *
 * var functionDeclaration = Base64Template.single({
 *  name: "atob",
 *  getWindowName: "newWindow",
 *  getWindow: () => {
 *    return acorn.parse("var newWindow = {}").body[0];
 *  }
 * });
 * ```
 *
 * Here, the `getWindow` variable is a function that returns an AST subtree. This must be a `Node[]` array or Template.
 * Optionally, the function can be replaced with just the `Node[]` array or Template if it's already computed.
 *
 * 3. Template subtree insertion
 *
 * ```js
 * var NewWindowTemplate = new Template(`
 *   var newWindow = {};
 * `);
 *
 * var Base64Template = new Template(`
 * function {name}(str){
 *   {NewWindowTemplate}
 *
 *   return newWindow.btoa(str)
 * }`)
 *
 * var functionDeclaration = Base64Template.single({
 *  name: "atob",
 *  NewWindowTemplate: NewWindowTemplate
 * });
 * ```
 */
export default class Template {
  templates: string[];
  defaultVariables: TemplateVariables;
  requiredVariables: Set<string>;

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
    var matches = this.templates[0].match(/{[$A-z0-9_]+}/g);
    if (matches !== null) {
      matches.forEach((variable) => {
        var name = variable.slice(1, -1);

        // $ variables are for default variables
        if (name.startsWith("$")) {
          throw new Error("Default variables are no longer supported.");
        } else {
          this.requiredVariables.add(name);
        }
      });
    }
  }

  /**
   * Interpolates the template with the given variables.
   *
   * Prepares the template string for AST parsing.
   *
   * @param variables
   */
  private interpolateTemplate(variables: TemplateVariables = {}) {
    var allVariables = { ...this.defaultVariables, ...variables };

    // Validate all variables were passed in
    for (var requiredVariable of this.requiredVariables) {
      if (typeof allVariables[requiredVariable] === "undefined") {
        throw new Error(
          this.templates[0] +
            " missing variable: " +
            requiredVariable +
            " from " +
            JSON.stringify(allVariables)
        );
      }
    }

    var template = choice(this.templates);
    var output = template;

    Object.keys(allVariables).forEach((name) => {
      var bracketName = "{" + name.replace("$", "\\$") + "}";

      var value = allVariables[name] + "";
      if (typeof allVariables[name] !== "string") {
        value = name;
      }

      var reg = new RegExp(bracketName, "g");

      output = output.replace(reg, value);
    });

    return { output, template };
  }

  /**
   * Finds the variables in the AST and replaces them with the given values.
   *
   * Note: Mutates the AST.
   * @param ast
   * @param variables
   */
  private interpolateAST(ast: Node, variables: TemplateVariables) {
    var allVariables = { ...this.defaultVariables, ...variables };

    var astNames = new Set(
      Object.keys(allVariables).filter((name) => {
        return typeof allVariables[name] !== "string";
      })
    );

    if (astNames.size === 0) return;

    traverse(ast, (o, p) => {
      if (o.type === "Identifier" && allVariables[o.name]) {
        return () => {
          var value = allVariables[o.name];
          ok(typeof value !== "string");

          var insertNodes = typeof value === "function" ? value() : value;
          if (insertNodes instanceof Template) {
            insertNodes = insertNodes.compile(allVariables);
          }

          if (!Array.isArray(insertNodes)) {
            // Replace with expression

            Object.assign(o, insertNodes);
          } else {
            // Insert multiple statements/declarations
            var expressionStatement: Node = p[0];
            var body: Node[] = p[1] as any;

            ok(expressionStatement.type === "ExpressionStatement");
            ok(Array.isArray(body));

            var index = body.indexOf(expressionStatement);

            body.splice(index, 1, ...insertNodes);
          }
        };
      }
    });
  }

  compile(variables: TemplateVariables = {}): Node[] {
    var { output, template } = this.interpolateTemplate(variables);

    var program: Node;
    try {
      program = parseSnippet(output);
    } catch (e) {
      throw new Error(output + "\n" + "Template failed to parse: " + e.message);
    }

    this.interpolateAST(program, variables);

    return program.body;
  }

  single(variables: TemplateVariables = {}): Node {
    var nodes = this.compile(variables);

    if (nodes.length !== 1) {
      nodes = nodes.filter((node) => node.type !== "EmptyStatement");
      ok(
        nodes.length === 1,
        `Expected single node, got ${nodes.map((node) => node.type).join(", ")}`
      );
    }

    return nodes[0];
  }
}
