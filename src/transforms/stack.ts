import { ok } from "assert";
import { stringify } from "querystring";
import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import Template from "../templates/template";
import { walk } from "../traverse";
import {
  AssignmentExpression,
  ExpressionStatement,
  Identifier,
  Literal,
  Location,
  MemberExpression,
  Node,
  RestElement,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import {
  getDefiningContext,
  getReferencingContexts,
  getVarContext,
  isForInitialize,
  isFunction,
  isVarContext,
  prepend,
} from "../util/insert";
import Transform from "./transform";

export default class Stack extends Transform {
  made: number;

  constructor(o) {
    super(o, ObfuscateOrder.Stack);

    this.made = 0;
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) &&
      !object.params.find((x) => x.type !== "Identifier") &&
      object.body.type === "BlockStatement" &&
      !parents.find((x) => x.$dispatcherSkip)
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      // Uncaught SyntaxError: Getter must not have any formal parameters.
      // Uncaught SyntaxError: Setter must have exactly one formal parameter
      var propIndex = parents.findIndex((x) => x.type == "Property");
      if (propIndex !== -1) {
        if (parents[propIndex].value === (parents[propIndex - 1] || object)) {
          if (parents[propIndex].kind !== "init" || parents[propIndex].method) {
            return;
          }
        }
      }

      var defined = new Set<string>();
      var referenced = new Set<string>();
      var illegal = new Set<string>();

      var map = new Map<string, Set<Location>>();

      var subscripts = new Map<string, number>();

      object.params.forEach((param) => {
        ok(param.name);
        defined.add(param.name);

        subscripts.set(param.name, subscripts.size);
      });

      var startingSize = subscripts.size;

      walk(object.body, [object, ...parents], (o, p) => {
        if (o.type == "Identifier") {
          var info = getIdentifierInfo(o, p);
          if (!info.spec.isReferenced) {
            return;
          }
          var c = info.spec.isDefined
            ? getDefiningContext(o, p)
            : getReferencingContexts(o, p).find((x) => isVarContext(x));

          if (c !== object) {
            this.log(o.name + " is illegal due to different context");
            illegal.add(o.name);
          }

          if (
            info.isClauseParameter ||
            info.isFunctionParameter ||
            isForInitialize(o, p)
          ) {
            this.log(
              o.name + " is illegal due to clause parameter/function parameter"
            );
            illegal.add(o.name);
          }
          if (o.hidden) {
            illegal.add(o.name);
          }

          if (info.spec.isDefined) {
            if (defined.has(o.name)) {
              illegal.add(o.name);
            }

            subscripts.set(o.name, subscripts.size);
            defined.add(o.name);

            var varIndex = p.findIndex((x) => x.type == "VariableDeclaration");
            if (
              varIndex !== -1 &&
              (varIndex !== 2 || p[varIndex].declarations.length > 1)
            ) {
              illegal.add(o.name);
            }
          } else if (info.spec.isReferenced) {
            referenced.add(o.name);
          }

          if (
            info.spec.isReferenced ||
            info.spec.isDefined ||
            info.spec.isModified
          ) {
            var set = map.get(o.name);
            if (!set) {
              map.set(o.name, new Set([[o, p]]));
            } else {
              set.add([o, p]);
            }
          }
        }
      });

      illegal.forEach((name) => {
        defined.delete(name);
        referenced.delete(name);
        map.delete(name);
        subscripts.delete(name);
      });

      referenced.forEach((name) => {
        if (!defined.has(name)) {
          map.delete(name);
          subscripts.delete(name);
        }
      });

      if (object.params.find((x) => illegal.has(x.name))) {
        return;
      }

      if (!subscripts.size) {
        return;
      }

      var stackName = this.getPlaceholder();

      const scan = (o, p) => {
        if (o.type == "Identifier") {
          var index = subscripts.get(o.name);
          if (typeof index === "number") {
            var info = getIdentifierInfo(o, p);

            var member = MemberExpression(
              Identifier(stackName),
              Literal(index),
              true
            );

            if (info.spec.isDefined) {
              if (info.isVariableDeclaration) {
                walk(p[2], p.slice(3), (oo, pp) => {
                  if (oo != o) {
                    scan(oo, pp);
                  }
                });

                this.replace(
                  p[2],
                  ExpressionStatement(
                    AssignmentExpression(
                      "=",
                      member,
                      p[0].init || Identifier("undefined")
                    )
                  )
                );
                return;
              } else if (info.isFunctionDeclaration) {
                walk(p[0], p.slice(1), (oo, pp) => {
                  if (oo != o) {
                    scan(oo, pp);
                  }
                });

                this.replace(
                  p[0],
                  ExpressionStatement(
                    AssignmentExpression("=", member, {
                      ...p[0],
                      type: "FunctionExpression",
                      id: null,
                      expression: false,
                    })
                  )
                );
                return;
              } else if (info.isClassDeclaration) {
                walk(p[0], p.slice(1), (oo, pp) => {
                  if (oo != o) {
                    scan(oo, pp);
                  }
                });

                this.replace(
                  p[0],
                  ExpressionStatement(
                    AssignmentExpression("=", member, {
                      ...p[0],
                      type: "ClassExpression",
                    })
                  )
                );
                return;
              }
            }

            if (info.spec.isReferenced) {
              this.replace(o, member);
            }
          }
        }
      };

      walk(object.body, [object, ...parents], (o, p) => {
        scan(o, p);
      });

      object.params = [RestElement(Identifier(stackName))];

      prepend(
        object.body,
        Template(`${stackName}.length = ${startingSize}`).single()
      );
    };
  }
}
