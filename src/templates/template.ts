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

  templates: string[];
  source: string;
}

export default function Template(...templates: string[]): ITemplate {
  ok(templates.length);

  var requiredVariables = new Set<string>();
  var defaultVariables: { [key: string]: string } = Object.create(null);

  var matches = templates[0].match(/{[$A-z0-9]+}/g);
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
    // Validate all variables were passed in
    for (var requiredVariable of requiredVariables) {
      if (typeof variables[requiredVariable] === "undefined") {
        throw new Error(
          templates[0] +
            " missing variable: " +
            requiredVariable +
            " from " +
            JSON.stringify(variables)
        );
      }
    }

    var template = choice(templates);
    var output = template;
    var allVariables = { ...defaultVariables, ...variables };

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
      throw new Error("Template failed to parse: " + output);
    }
  }

  function single(variables?: { [name: string]: string | number }): Node {
    var nodes = compile(variables);
    return nodes[0];
  }

  var obj: ITemplate = {
    fill,
    compile,
    single,
    templates,
    source: templates[0],
  };

  return obj;
}
