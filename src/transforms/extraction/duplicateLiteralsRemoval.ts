import Transform from "../transform";
import {
  Identifier,
  Literal,
  VariableDeclaration,
  Node,
  ArrayExpression,
  MemberExpression,
  VariableDeclarator,
  Location,
  ReturnStatement,
  CallExpression,
  BinaryExpression,
  FunctionDeclaration,
  ThisExpression,
  ConditionalExpression,
} from "../../util/gen";
import { append, clone, prepend } from "../../util/insert";
import { isDirective, isPrimitive } from "../../util/compare";

import { ObfuscateOrder } from "../../order";
import { isModuleSource } from "../string/stringConcealing";
import { ComputeProbabilityMap } from "../../probability";
import { ok } from "assert";
import { chance, choice, getRandomInteger } from "../../util/random";
import { getBlock } from "../../traverse";
import { getIdentifierInfo } from "../../util/identifiers";

/**
 * [Duplicate Literals Removal](https://docs.jscrambler.com/code-integrity/documentation/transformations/duplicate-literals-removal) replaces duplicate literals with a variable name.
 *
 * - Potency Medium
 * - Resilience Medium
 * - Cost Medium
 *
 * ```js
 * // Input
 * var foo = "http://www.example.xyz";
 * bar("http://www.example.xyz");
 *
 * // Output
 * var a = "http://www.example.xyz";
 * var foo = a;
 * bar(a);
 * ```
 */
export default class DuplicateLiteralsRemoval extends Transform {
  // The array holding all the duplicate literals
  arrayName: string;
  // The array expression node to be inserted into the program
  arrayExpression: Node;

  /**
   * Literals in the array
   */
  map: Map<string, number>;

  /**
   * Literals are saved here the first time they are seen.
   */
  first: Map<string, Location>;

  /**
   * Block -> { functionName, indexShift }
   */
  functions: Map<Node, { functionName: string; indexShift: number }>;

  constructor(o) {
    super(o, ObfuscateOrder.DuplicateLiteralsRemoval);

    this.map = new Map();
    this.first = new Map();

    this.functions = new Map();
  }

  apply(tree) {
    super.apply(tree);

    if (this.arrayName && this.arrayExpression.elements.length > 0) {
      // This function simply returns the array
      var getArrayFn = this.getPlaceholder();
      append(
        tree,
        FunctionDeclaration(
          getArrayFn,
          [],
          [ReturnStatement(this.arrayExpression)]
        )
      );

      // This variable holds the array
      prepend(
        tree,
        VariableDeclaration(
          VariableDeclarator(
            this.arrayName,
            CallExpression(
              MemberExpression(Identifier(getArrayFn), Literal("call"), true),
              [ThisExpression()]
            )
          )
        )
      );

      // Create all the functions needed
      for (var blockNode of this.functions.keys()) {
        var { functionName, indexShift } = this.functions.get(blockNode);

        var propertyNode: Node = BinaryExpression(
          "-",
          Identifier("index_param"),
          Literal(indexShift)
        );

        var indexRangeInclusive = [
          0 + indexShift - 1,
          this.map.size + indexShift,
        ];

        // The function uses mangling to hide the index being accessed
        var mangleCount = getRandomInteger(1, 10);
        for (var i = 0; i < mangleCount; i++) {
          var operator = choice([">", "<"]);
          var compareValue = choice(indexRangeInclusive);

          var test = BinaryExpression(
            operator,
            Identifier("index_param"),
            Literal(compareValue)
          );

          var alternate = BinaryExpression(
            "-",
            Identifier("index_param"),
            Literal(getRandomInteger(-100, 100))
          );

          var testValue =
            (operator === ">" && compareValue === indexRangeInclusive[0]) ||
            (operator === "<" && compareValue === indexRangeInclusive[1]);

          propertyNode = ConditionalExpression(
            test,
            testValue ? propertyNode : alternate,
            !testValue ? propertyNode : alternate
          );
        }

        var returnArgument = MemberExpression(
          Identifier(this.arrayName),
          propertyNode,
          true
        );

        prepend(
          blockNode,
          FunctionDeclaration(
            functionName,
            [Identifier("index_param")],
            [ReturnStatement(returnArgument)]
          )
        );
      }
    }
  }

  match(object: Node, parents: Node[]) {
    return (
      isPrimitive(object) &&
      !isDirective(object, parents) &&
      !isModuleSource(object, parents) &&
      !parents.find((x) => x.$dispatcherSkip)
    );
  }

  /**
   * Converts ordinary literal to go through a getter function.
   * @param object
   * @param parents
   * @param index
   */
  transformLiteral(object: Node, parents: Node[], index: number) {
    var blockNode = choice(parents.filter((x) => this.functions.has(x)));

    // Create initial function if none exist
    if (this.functions.size === 0) {
      var root = parents[parents.length - 1];
      var rootFunctionName = this.getPlaceholder() + "_dLR_0";
      this.functions.set(root, {
        functionName: rootFunctionName,
        indexShift: getRandomInteger(-100, 100),
      });

      blockNode = root;
    }

    // If no function here exist, possibly create new chained function
    var block = getBlock(object, parents);
    if (!this.functions.has(block) && chance(50 - this.functions.size)) {
      var newFunctionName =
        this.getPlaceholder() + "_dLR_" + this.functions.size;

      this.functions.set(block, {
        functionName: newFunctionName,
        indexShift: getRandomInteger(-100, 100),
      });

      blockNode = block;
    }

    // Derive the function to call from the selected blockNode
    var { functionName, indexShift } = this.functions.get(blockNode);

    // Call the function given it's indexShift
    var callExpression = CallExpression(Identifier(functionName), [
      Literal(index + indexShift),
    ]);

    this.replaceIdentifierOrLiteral(object, callExpression, parents);
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (object.type === "Identifier") {
        var info = getIdentifierInfo(object, parents);
        if (info.isLabel || info.spec.isDefined) return;
      }
      if (object.regex) {
        return;
      }

      if (!ComputeProbabilityMap(this.options.duplicateLiteralsRemoval)) {
        return;
      }

      // HARD CODED LIMIT of 10,000 (after 1,000 elements)
      if (this.map.size > 1000 && chance(this.map.size / 100)) return;

      if (
        this.arrayName &&
        parents[0].object &&
        parents[0].object.name == this.arrayName
      ) {
        return;
      }

      var stringValue;
      if (object.type == "Literal") {
        stringValue = typeof object.value + ":" + object.value;
        if (object.value === null) {
          stringValue = "null:null";
        } else {
          // Skip empty strings
          if (typeof object.value === "string" && !object.value) {
            return;
          }
        }
      } else if (object.type == "Identifier") {
        stringValue = "identifier:" + object.name;
      } else {
        throw new Error("Unsupported primitive type: " + object.type);
      }

      ok(stringValue);

      if (this.map.has(stringValue) || this.first.has(stringValue)) {
        // Create the array if not already made
        if (!this.arrayName) {
          this.arrayName = this.getPlaceholder();
          this.arrayExpression = ArrayExpression([]);
        }

        // Delete with first location
        var firstLocation = this.first.get(stringValue);
        if (firstLocation) {
          var index = this.map.size;

          ok(!this.map.has(stringValue));
          this.map.set(stringValue, index);
          this.first.delete(stringValue);

          var pushing = clone(object);
          this.arrayExpression.elements.push(pushing);

          ok(this.arrayExpression.elements[index] === pushing);

          this.transformLiteral(firstLocation[0], firstLocation[1], index);
        }

        var index = this.map.get(stringValue);
        ok(typeof index === "number");

        this.transformLiteral(object, parents, index);
        return;
      }

      // Save this, maybe a duplicate will be found.
      this.first.set(stringValue, [object, parents]);
    };
  }
}
