import { ok } from "assert";
import { writeFileSync } from "fs";
import { ObfuscateOptions, remove$Properties } from "./index";
import { Node } from "./util/gen";

const escodegen = require("escodegen");

export default async function compileJs(tree: any, options: ObfuscateOptions) {
  return compileJsSync(tree, options);
}

export function compileJsSync(tree: any, options: ObfuscateOptions): string {
  var api: any = { format: escodegen.FORMAT_MINIFY };

  if (!options.compact) {
    api = {};

    if (options.indent && options.indent != 4) {
      api.format = {};
      api.format.indent = {
        style: { 2: "  ", tabs: "\t" }[options.indent] || "    ",
      };
    }
  }

  if (options.debugComments) {
    api.comment = true;
  }

  return escodegen.generate(tree, api);
}

export function getToStringValue(
  tree: Node,
  syntax: (code: string) => string,
  options: ObfuscateOptions
) {
  ok(tree);
  ok(tree.type);
  ok(!Array.isArray(tree));
  ok(typeof syntax === "function");

  var generated = escodegen.generate(tree);
  ok(typeof generated === "string");

  var fullCode = syntax(generated);
  ok(typeof fullCode === "string");

  try {
    var result = eval(fullCode);
  } catch (e) {
    console.log(">>", fullCode);
    throw e;
  }

  return result && result.toString();
}
