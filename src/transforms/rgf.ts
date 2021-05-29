import { ok } from "assert";
import { compileJsSync } from "../compiler";
import { reservedIdentifiers } from "../constants";
import Obfuscator from "../obfuscator";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import traverse, { walk } from "../traverse";
import {
  ArrayExpression,
  CallExpression,
  FunctionExpression,
  Identifier,
  Literal,
  Location,
  MemberExpression,
  NewExpression,
  Node,
  ReturnStatement,
  SpreadElement,
  VariableDeclaration,
  VariableDeclarator,
} from "../util/gen";
import { getDefiningIdentifier, getIdentifierInfo } from "../util/identifiers";
import {
  getVarContext,
  isVarContext,
  isFunction,
  prepend,
} from "../util/insert";
import Transform from "./transform";

/**
 * Converts function to `new Function("..code..")` syntax as an alternative to `eval`. Eval is disabled in many environments.
 *
 * `new Function("..code..")` runs in an isolated context, meaning all local variables are undefined and throw errors.
 *
 * Rigorous checks are in place to only include pure functions.
 *
 * `flatten` can attempt to make function reference-less. Recommended to have flatten enabled with RGF.
 *
 * | Mode | Description |
 * | --- | --- |
 * | `"all"` | Applies to all scopes |
 * | `true` | Applies to the top level only |
 * | `false` | Feature disabled |
 */
export default class RGF extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.RGF);
  }

  match(object, parents) {
    return isVarContext(object);
  }

  transform(contextObject, contextParents) {
    return () => {
      var isGlobal = contextObject.type == "Program";

      var value = ComputeProbabilityMap(this.options.rgf, (x) => x, isGlobal);
      if (value !== "all" && !isGlobal) {
        return;
      }

      var collect: {
        location: Location;
        references: Set<string>;
        name?: string;
      }[] = [];
      var queue: Location[] = [];
      var names = new Map<string, number>();
      var definingNodes = new Map<string, Node>();

      walk(contextObject, contextParents, (object, parents) => {
        if (
          object !== contextObject &&
          isFunction(object) &&
          getVarContext(parents[0], parents.slice(1)) === contextObject
        ) {
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
              } else if (info.spec.isReferenced || info.spec.isModified) {
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

          collect.push({
            location: [object, parents],
            references: referenced,
            name: object.id?.name,
          });
        }
      });

      if (!collect.length) {
        return;
      }

      var miss = 0;
      var start = collect.length * 2;

      while (true) {
        var hit = false;

        collect.forEach(
          ({ name, references: references1, location: location1 }) => {
            if (!references1.size && name) {
              collect.forEach((o) => {
                if (
                  o.location !== location1 &&
                  o.references.size &&
                  o.references.delete(name)
                ) {
                  // console.log(collect);

                  hit = true;
                }
              });
            }
          }
        );
        if (hit) {
          miss = 0;
        } else {
          miss++;
        }

        if (miss > start) {
          break;
        }
      }

      queue = [];
      collect.forEach((o) => {
        if (!o.references.size) {
          var [object, parents] = o.location;

          queue.push([object, parents]);
          if (
            object.type == "FunctionDeclaration" &&
            typeof object.id.name === "string"
          ) {
            var index = names.size;

            names.set(object.id.name, index);
            definingNodes.set(object.id.name, object.id);
          }
        }
      });

      if (!queue.length) {
        return;
      }

      var referenceArray = this.generateIdentifier();

      walk(contextObject, contextParents, (o, p) => {
        if (o.type == "Identifier" && !reservedIdentifiers.has(o.name)) {
          var index = names.get(o.name);
          if (typeof index === "number") {
            var info = getIdentifierInfo(o, p);
            if (info.spec.isReferenced && !info.spec.isDefined) {
              var location = getDefiningIdentifier(o, p);
              if (location) {
                var pointingTo = location[0];
                var shouldBe = definingNodes.get(o.name);

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

      prepend(contextObject, variableDeclaration);

      queue.forEach(([object, parents]) => {
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
          arrayExpression.elements[names.get(name)] = newFunction;

          if (Array.isArray(parents[0])) {
            parents[0].splice(parents[0].indexOf(object), 1);
          }
        } else {
          this.replace(object, newFunction);
        }
      });
    };
  }
}
