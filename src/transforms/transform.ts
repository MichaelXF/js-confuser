import traverse, { ExitCallback } from "../traverse";
import {
  AddComment,
  Node,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import {
  alphabeticalGenerator,
  choice,
  getRandomInteger,
} from "../util/random";
import { ok } from "assert";
import Obfuscator from "../obfuscator";
import { ObfuscateOptions } from "../options";
import { ComputeProbabilityMap } from "../probability";
import {
  placeholderVariablePrefix,
  reservedIdentifiers,
  reservedKeywords,
} from "../constants";
import { ObfuscateOrder } from "../order";
import { ITemplate } from "../templates/template";
import { prepend } from "../util/insert";

/**
 * Base-class for all transformations.
 * - Transformations can have preparation transformations `.before`
 * - Transformations can have cleanup transformations `.after`
 *
 * - `match()` function returns true/false if possible candidate
 * - `transform()` function modifies the object
 *
 * ```js
 * class Example extends Transform {
 *   constructor(o){
 *     super(o);
 *   }
 *
 *   match(object, parents){
 *     return object.type == "...";
 *   }
 *
 *   transform(object, parents){
 *     // onEnter
 *
 *     return ()=>{
 *       // onExit
 *     }
 *   }
 *
 *   apply(tree){
 *     // onStart
 *
 *     super.apply(tree);
 *
 *     // onEnd
 *   }
 * }
 * ```
 */
export default class Transform {
  /**
   * The obfuscator.
   */
  obfuscator: Obfuscator;

  /**
   * The user's options.
   */
  options: Obfuscator["options"];

  /**
   * Only required for top-level transformations.
   */
  priority: number;

  /**
   * Transforms to run before, such as `Variable Analysis`.
   */
  before: Transform[];

  /**
   * Transforms to run after.
   */
  after: Transform[];

  initVariables = new Map<string, string>();

  get targetName() {
    ok(typeof this.options.target !== "string");
    return this.options.target.name;
  }

  constructor(obfuscator, priority: number = -1) {
    ok(obfuscator instanceof Obfuscator, "obfuscator should be an Obfuscator");

    this.obfuscator = obfuscator;
    this.options = this.obfuscator.options;

    this.priority = priority;

    this.before = [];
    this.after = [];
  }

  /**
   * The transformation name.
   */
  get className() {
    return (
      ObfuscateOrder[this.priority] || (this as any).__proto__.constructor.name
    );
  }

  /**
   * Run an AST through the transformation (including `pre` and `post` transforms)
   * @param tree
   */
  apply(tree: Node) {
    if (tree.type == "Program" && this.options.verbose) {
      if (this.priority === -1) {
        console.log("#", ">", this.className);
      } else {
        console.log("#", this.priority, this.className);
      }
    }

    /**
     * Run through pre-transformations
     */
    this.before.forEach((x) => x.apply(tree));

    /**
     * Run this transformation
     */
    traverse(tree, (object, parents) => {
      return this.input(object, parents);
    });

    /**
     * Cleanup transformations
     */
    this.after.forEach((x) => x.apply(tree));
  }

  /**
   * The `match` function filters for possible candidates.
   *
   * - If `true`, the node is sent to the `transform()` method
   * - else it's discarded.
   *
   * @param object
   * @param parents
   * @param block
   */
  match(object: Node, parents: Node[]): boolean {
    throw new Error("not implemented");
  }

  /**
   * Modifies the given node.
   *
   * - Return a function to be ran when the node is exited.
   * - The node is safe to modify in most cases.
   *
   * @param object - Current node
   * @param parents - Array of ancestors `[Closest, ..., Root]`
   * @param block
   */
  transform(object: Node, parents: Node[]): ExitCallback | void {
    throw new Error("not implemented");
  }

  /**
   * Calls `.match` with the given parameters, and then `.transform` if satisfied.
   * @private
   */
  input(object: Node, parents: Node[]): ExitCallback | void {
    if (this.match(object, parents)) {
      return this.transform(object, parents);
    }
  }

  /**
   * Returns a random string.
   *
   * Used for creating temporary variables names, typically before RenameVariables has ran.
   *
   * These long temp names will be converted to short, mangled names by RenameVariables.
   */
  getPlaceholder() {
    const genRanHex = (size) =>
      [...Array(size)]
        .map(() => Math.floor(Math.random() * 10).toString(10))
        .join("");
    return placeholderVariablePrefix + genRanHex(10);
  }

  /**
   * Returns an independent name generator with it's own counter.
   * @param overrideMode - Override the user's `identifierGenerator` option
   * @returns
   */
  getGenerator(overrideMode?: string) {
    var count = 0;
    var identifiers = new Set();
    return {
      generate: () => {
        var retValue: string;
        do {
          count++;
          retValue = this.generateIdentifier(-1, count, overrideMode);
        } while (identifiers.has(retValue));

        identifiers.add(retValue);

        return retValue;
      },
    };
  }

  /**
   * Generates a valid variable name.
   * @param length Default length is 6 to 10 characters.
   * @returns **`string`**
   */
  generateIdentifier(
    length: number = -1,
    count = -1,
    overrideMode?: string
  ): string {
    if (length == -1) {
      length = getRandomInteger(6, 8);
    }

    var set = new Set();

    if (count == -1) {
      this.obfuscator.varCount++;
      count = this.obfuscator.varCount;
      set = this.obfuscator.generated;
    }

    var identifier;
    do {
      identifier = ComputeProbabilityMap(
        overrideMode || this.options.identifierGenerator,
        (mode = "randomized") => {
          switch (mode) {
            case "randomized":
              var characters =
                "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split(
                  ""
                );
              var numbers = "0123456789".split("");

              var combined = [...characters, ...numbers];

              var result = "";
              for (var i = 0; i < length; i++) {
                result += choice(i == 0 ? characters : combined);
              }
              return result;

            case "hexadecimal":
              const genRanHex = (size) =>
                [...Array(size)]
                  .map(() => Math.floor(Math.random() * 16).toString(16))
                  .join("");

              return "_0x" + genRanHex(length).toUpperCase();

            case "mangled":
              while (1) {
                var result = alphabeticalGenerator(count);
                count++;

                if (
                  reservedKeywords.has(result) ||
                  reservedIdentifiers.has(result)
                ) {
                } else {
                  return result;
                }
              }

              throw new Error("impossible but TypeScript insists");

            case "number":
              return "var_" + count;

            case "zeroWidth":
              var keyWords = [
                "if",
                "in",
                "for",
                "let",
                "new",
                "try",
                "var",
                "case",
                "else",
                "null",
                "break",
                "catch",
                "class",
                "const",
                "super",
                "throw",
                "while",
                "yield",
                "delete",
                "export",
                "import",
                "public",
                "return",
                "switch",
                "default",
                "finally",
                "private",
                "continue",
                "debugger",
                "function",
                "arguments",
                "protected",
                "instanceof",
                "function",
                "await",
                "async",
              ];

              var safe = "\u200C".repeat(count + 1);

              var base = choice(keyWords) + safe;
              return base;
          }

          throw new Error("Invalid 'identifierGenerator' mode: " + mode);
        }
      );
    } while (set.has(identifier));

    if (!identifier) {
      throw new Error("identifier null");
    }

    set.add(identifier);

    return identifier;
  }

  createInitVariable = (value: ITemplate, parents: Node[]) => {
    var key = value.templates[0];
    if (this.initVariables.has(key)) {
      return this.initVariables.get(key);
    }

    var root = parents[parents.length - 1];
    ok(root.type === "Program");

    var name = this.getPlaceholder();
    this.initVariables.set(key, name);

    prepend(
      root,
      VariableDeclaration(VariableDeclarator(name, value.single().expression))
    );

    return name;
  };

  /**
   * Smartly appends a comment to a Node.
   * - Includes the transformation's name.
   * @param node
   * @param text
   * @param i
   */
  addComment(node: Node, text: string) {
    if (this.options.debugComments) {
      return AddComment(node, `[${this.className}] ${text}`);
    }
    return node;
  }

  replace(node1: Node, node2: Node) {
    for (var key in node1) {
      delete node1[key];
    }

    this.objectAssign(node1, node2);
  }

  replaceIdentifierOrLiteral(node1: Node, node2: Node, parents: Node[]) {
    // Fix 2. Make parent property key computed
    if (
      parents[0] &&
      (parents[0].type == "Property" ||
        parents[0].type == "MethodDefinition") &&
      parents[0].key == node1
    ) {
      parents[0].computed = true;
      parents[0].shorthand = false;
    }
    this.replace(node1, node2);
  }

  /**
   * Smartly merges two Nodes.
   * - Null checking
   * - Preserves comments
   * @param node1
   * @param node2
   */
  objectAssign(node1: Node, node2: Node): Node {
    ok(node1);
    ok(node2);

    var comments1 = node1.leadingComments || [];
    var comments2 = node2.leadingComments || [];
    var comments = [...comments1, ...comments2];

    node2.leadingComments = comments;

    node1._transform = node2._transform = this.className;

    return Object.assign(node1, node2);
  }

  /**
   * Verbose logging for this transformation.
   * @param messages
   */
  log(...messages: any[]) {
    if (this.options.verbose) {
      console.log("[" + this.className + "]", ...messages);
    }
  }

  /**
   * Verbose logging for warning/important messages.
   * @param messages
   */
  warn(...messages: any[]) {
    if (this.options.verbose) {
      console.log("[ WARN " + this.className + " ]", ...messages);
    }
  }

  /**
   * Throws an error. Appends the transformation's name to the error's message.
   * @param error
   */
  error(error: Error): never {
    throw new Error(`${this.className} Error: ${error.message}`);
  }
}
