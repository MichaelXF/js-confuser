import { Node } from "../util/gen";
import { parseSnippet, parseSync } from "../parser";
import { ok } from "assert";
import { choice } from "../util/random";
import { placeholderVariablePrefix } from "../constants";

export interface ITemplate {
  fill(variables?: { [name: string]: string | number }): {
    output: string;
    template: string;
  };

  compile(variables?: { [name: string]: string | number }): Node[];

  single(variables?: { [name: string]: string | number }): Node;

  variables(variables): ITemplate;

  ignoreMissingVariables(): ITemplate;

  templates: string[];
  source: string;
}

export default function Template(...templates: string[]): ITemplate {
  ok(templates.length);

  var requiredVariables = new Set<string>();
  var providedVariables = {};
  var defaultVariables: { [key: string]: string } = Object.create(null);

  // This may picked up "$mb[pP`x]" from String Encoding function
  // ignoreMissingVariables() prevents this
  var matches = templates[0].match(/{[$A-z0-9_]+}/g);
  if (matches !== null) {
    matches.forEach((variable) => {
      var name = variable.slice(1, -1);

      // $ variables are for default variables
      if (name.startsWith("$")) {
        defaultVariables[name] =
          placeholderVariablePrefix +
          "td_" +
          Object.keys(defaultVariables).length;
      } else {
        requiredVariables.add(name);
      }
    });
  }

  function fill(
    variables: { [name: string]: string | number } = Object.create(null)
  ) {
    var userVariables = { ...providedVariables, ...variables };

    // Validate all variables were passed in
    for (var requiredVariable of requiredVariables) {
      if (typeof userVariables[requiredVariable] === "undefined") {
        throw new Error(
          templates[0] +
            " missing variable: " +
            requiredVariable +
            " from " +
            JSON.stringify(userVariables)
        );
      }
    }

    var template = choice(templates);
    var output = template;
    var allVariables = {
      ...defaultVariables,
      ...userVariables,
    };

    Object.keys(allVariables).forEach((name) => {
      var bracketName = "{" + name.replace("$", "\\$") + "}";
      var value = allVariables[name] + "";

      var reg = new RegExp(bracketName, "g");

      output = output.replace(reg, value);
    });

    return { output, template };
  }

  function compile(variables: { [name: string]: string | number }): Node[] {
    var { output, template } = fill(variables);
    try {
      var program = parseSnippet(output);

      return program.body;
    } catch (e) {
      console.error(e);
      console.error(template);
      console.error({ ...providedVariables, ...variables });
      throw new Error(
        "Template failed to parse: OUTPUT= " + output + " SOURCE= " + template
      );
    }
  }

  function single(variables?: { [name: string]: string | number }): Node {
    var nodes = compile(variables);
    return nodes[0];
  }

  function variables(newVariables) {
    Object.assign(providedVariables, newVariables);
    return obj;
  }

  function ignoreMissingVariables() {
    defaultVariables = Object.create(null);
    requiredVariables.clear();
    return obj;
  }

  var obj: ITemplate = {
    fill,
    compile,
    single,
    templates,
    variables,
    ignoreMissingVariables,
    source: templates[0],
  };

  return obj;
}
