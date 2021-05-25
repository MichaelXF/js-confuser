import { ok } from "assert";
import { compileJsSync } from "../compiler";
import { ComputeProbabilityMap } from "../index";
import Obfuscator, { ObfuscateOrder } from "../obfuscator";
import { parseSnippet, parseSync } from "../parser";
import Template from "../templates/template";
import traverse, { getDepth, walk } from "../traverse";
import {
  ArrayExpression,
  AssignmentExpression,
  BreakStatement,
  CallExpression,
  Chain,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Literal,
  Location,
  MemberExpression,
  NewExpression,
  Node,
  ObjectExpression,
  Property,
  ReturnStatement,
  SpreadElement,
  SwitchCase,
  SwitchStatement,
  ThisExpression,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { getDefiningIdentifier, getIdentifierInfo } from "../util/identifiers";
import {
  getBlockBody,
  getContext,
  isContext,
  isFunction,
  prepend,
} from "../util/insert";
import RenameVariables from "./identifier/renameVariables";
import Transform, { reservedIdentifiers } from "./transform";

export default class RGF extends Transform {
  collect: { location: Location; references: Set<string>; name?: string }[];

  queue: Location[];
  names: Map<string, number>;
  definingNodes: Map<string, Node>;

  constructor(o) {
    super(o, ObfuscateOrder.RGF);

    this.collect = [];
    this.queue = [];
    this.names = new Map();
    this.definingNodes = new Map();
  }

  apply(tree) {
    super.apply(tree);

    if (!this.collect.length) {
      return;
    }

    this.collect.forEach(({ name }) => {
      this.collect.forEach(({ references }) => {
        references.delete(name);
      });
    });

    this.queue = [];
    this.collect.forEach((o) => {
      if (!o.references.size) {
        var [object, parents] = o.location;

        this.queue.push([object, parents]);
        if (
          object.type == "FunctionDeclaration" &&
          typeof object.id.name === "string"
        ) {
          var index = this.names.size;

          this.names.set(object.id.name, index);
          this.definingNodes.set(object.id.name, object.id);
        }
      }
    });

    if (!this.queue.length) {
      return;
    }

    var referenceArray = this.generateIdentifier();

    traverse(tree, (o, p) => {
      if (o.type == "Identifier" && !reservedIdentifiers.has(o.name)) {
        var index = this.names.get(o.name);
        if (typeof index === "number") {
          var info = getIdentifierInfo(o, p);
          if (info.spec.isReferenced && !info.spec.isDefined) {
            var location = getDefiningIdentifier(o, p);
            if (location) {
              var pointingTo = location[0];
              var shouldBe = this.definingNodes.get(o.name);

              // console.log(pointingTo, shouldBe);

              if (pointingTo == shouldBe) {
                this.log(o.name, "->", `${referenceArray}[${index}]`);

                this.replace(
                  o,
                  FunctionExpression(
                    [],
                    [
                      ReturnStatement(
                        CallExpression(
                          MemberExpression(
                            Identifier(referenceArray),
                            Literal(index),
                            true
                          ),
                          [
                            Identifier(referenceArray),
                            SpreadElement(Identifier("arguments")),
                          ]
                        )
                      ),
                    ]
                  )
                );
              }
            }
          }
        }
      }
    });

    var arrayExpression = ArrayExpression([]);
    var variableDeclaration = VariableDeclaration([
      VariableDeclarator(Identifier(referenceArray), arrayExpression),
    ]);

    prepend(tree, variableDeclaration);

    this.queue.forEach(([object, parents]) => {
      var name = object?.id?.name;
      var hasName = !!name;
      var params = object.params.map((x) => x.name) || [];

      // Since `new Function` is completely isolated, create an entire new obfuscator and run remaining transformations.
      // RGF runs early and needs completed code before converting to a string.
      var o = new Obfuscator({
        ...this.options,
      });
      var t = Object.values(o.transforms).filter(
        (x) => x.priority > this.priority
      );

      var tree = {
        type: "Program",
        body: [
          object,
          ReturnStatement(
            CallExpression(Identifier(object.id.name), [
              SpreadElement(
                Template(`Array.prototype.slice.call(arguments, 1)`).single()
                  .expression
              ),
            ])
          ),
        ],
      };

      t.forEach((x) => {
        x.apply(tree);
      });

      var toString = compileJsSync(tree, this.options);

      var newFunction = NewExpression(Identifier("Function"), [
        Literal(referenceArray),
        Literal(toString),
      ]);

      if (hasName) {
        arrayExpression.elements[this.names.get(name)] = newFunction;

        if (Array.isArray(parents[0])) {
          parents[0].splice(parents[0].indexOf(object), 1);
        }
      } else {
        this.replace(object, newFunction);
      }
    });
  }

  match(object, parents) {
    return (
      isFunction(object) &&
      getContext(parents[0], parents.slice(1)) == parents[parents.length - 1]
    );
  }

  transform(object, parents) {
    var defined = new Set<string>(),
      referenced = new Set<string>();

    walk(object.body, [object, ...parents], (o, p) => {
      if (
        o.type == "Identifier" &&
        !reservedIdentifiers.has(o.name) &&
        !this.options.globalVariables.has(o.name)
      ) {
        var info = getIdentifierInfo(o, p);
        if (info.spec.isDefined) {
          defined.add(o.name);
        } else if (info.spec.isReferenced) {
          referenced.add(o.name);
        }
      }
    });

    defined.forEach((identifier) => {
      referenced.delete(identifier);
    });

    object.params.forEach((param) => {
      referenced.delete(param.name);
    });

    this.collect.push({
      location: [object, parents],
      references: referenced,
      name: object.id?.name,
    });
  }
}
