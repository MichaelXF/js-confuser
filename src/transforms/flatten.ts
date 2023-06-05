import { ok } from "assert";
import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import traverse, { walk } from "../traverse";
import {
  Identifier,
  ReturnStatement,
  VariableDeclaration,
  VariableDeclarator,
  CallExpression,
  MemberExpression,
  ArrayExpression,
  ExpressionStatement,
  AssignmentExpression,
  Node,
  BlockStatement,
  ArrayPattern,
  FunctionExpression,
  ObjectExpression,
  Property,
  Literal,
  IfStatement,
  ThrowStatement,
  NewExpression,
  AwaitExpression,
  UnaryExpression,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import { getBlockBody, getVarContext, prepend, clone } from "../util/insert";
import { chance, shuffle } from "../util/random";
import Transform from "./transform";

/**
 * Brings every function to the global level.
 *
 * Functions take parameters, input, have a return value and return modified changes to the scoped variables.
 *
 * ```js
 * function topLevel(ref1, ref2, refN, param1, param2, paramN){
 *   return [ref1, ref2, refN, returnValue];
 * }
 * ```
 *
 * Flatten is used to make functions eligible for the RGF transformation.
 */
export default class Flatten extends Transform {
  definedNames: Map<Node, Set<string>>;
  flattenedFns: Node[];
  gen: ReturnType<Transform["getGenerator"]>;

  constructor(o) {
    super(o, ObfuscateOrder.Flatten);

    this.definedNames = new Map();
    this.flattenedFns = [];
    this.gen = this.getGenerator();
  }

  apply(tree) {
    traverse(tree, (o, p) => {
      if (
        o.type == "Identifier" &&
        !reservedIdentifiers.has(o.name) &&
        !this.options.globalVariables.has(o.name)
      ) {
        var info = getIdentifierInfo(o, p);
        if (info.spec.isReferenced) {
          if (info.spec.isDefined) {
            var c = getVarContext(o, p);
            if (c) {
              if (!this.definedNames.has(c)) {
                this.definedNames.set(c, new Set([o.name]));
              } else {
                this.definedNames.get(c).add(o.name);
              }
            }
          }
        }
      }
    });

    super.apply(tree);

    if (this.flattenedFns.length) {
      prepend(tree, VariableDeclaration(this.flattenedFns));
    }
  }

  match(object: Node, parents: Node[]) {
    return (
      (object.type == "FunctionDeclaration" ||
        object.type === "FunctionExpression") &&
      object.body.type == "BlockStatement" &&
      !object.generator &&
      !object.params.find((x) => x.type !== "Identifier")
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      if (parents[0]) {
        // Don't change class methods
        if (
          parents[0].type === "MethodDefinition" &&
          parents[0].value === object
        ) {
          return;
        }

        // Don't change getter/setter methods
        if (
          parents[0].type === "Property" &&
          parents[0].value === object &&
          parents[0].kind !== "init"
        ) {
          return;
        }
      }

      ok(
        object.type === "FunctionDeclaration" ||
          object.type === "FunctionExpression"
      );

      // The name is purely for debugging purposes
      var currentFnName =
        object.type === "FunctionDeclaration"
          ? object.id?.name
          : parents[0]?.type === "VariableDeclarator" &&
            parents[0].id?.type === "Identifier" &&
            parents[0].id?.name;

      if (parents[0]?.type === "Property" && parents[0]?.key) {
        currentFnName =
          currentFnName ||
          String(parents[0]?.key?.name || parents[0]?.key?.value);
      }

      if (!currentFnName) currentFnName = "unnamed";

      var defined = new Set<string>();
      var references = new Set<string>();
      var modified = new Set<string>();

      var illegal = new Set<string>();
      var isIllegal = false;

      var definedAbove = new Set<string>(this.options.globalVariables);

      parents.forEach((x) => {
        var set = this.definedNames.get(x);
        if (set) {
          set.forEach((name) => definedAbove.add(name));
        }
      });

      walk(object, parents, (o, p) => {
        if (object.id && o === object.id) {
          return;
        }

        if (
          o.type == "Identifier" &&
          !this.options.globalVariables.has(o.name) &&
          !reservedIdentifiers.has(o.name)
        ) {
          var info = getIdentifierInfo(o, p);
          if (!info.spec.isReferenced) {
            return;
          }

          if (o.hidden) {
            illegal.add(o.name);
          } else if (info.spec.isDefined) {
            defined.add(o.name);
          } else if (info.spec.isModified) {
            modified.add(o.name);
          } else {
            references.add(o.name);
          }
        }

        if (o.type == "TryStatement") {
          isIllegal = true;
          return "EXIT";
        }

        if (o.type == "Identifier") {
          if (o.name == "arguments") {
            isIllegal = true;
            return "EXIT";
          }
        }

        if (o.type == "ThisExpression") {
          isIllegal = true;
          return "EXIT";
        }

        if (o.type == "Super") {
          isIllegal = true;
          return "EXIT";
        }

        if (o.type == "MetaProperty") {
          isIllegal = true;
          return "EXIT";
        }

        if (o.type == "VariableDeclaration" && o.kind !== "var") {
          isIllegal = true;
          return "EXIT";
        }
      });

      if (isIllegal) {
        return;
      }
      if (illegal.size) {
        return;
      }

      defined.forEach((name) => {
        references.delete(name);
        modified.delete(name);
      });

      // console.log(object.id.name, illegal, references);

      var input = Array.from(new Set([...modified, ...references]));

      if (Array.from(input).find((x) => !definedAbove.has(x))) {
        return;
      }

      var output = Array.from(modified);

      var newName = this.getPlaceholder() + "_flat_" + currentFnName;
      var resultName = this.getPlaceholder();
      var propName = this.gen.generate();

      var newOutputNames: { [originalName: string]: string } =
        Object.create(null);
      output.forEach((name) => {
        newOutputNames[name] = this.gen.generate();
      });
      var returnOutputName = this.gen.generate();

      getBlockBody(object.body).push(ReturnStatement());
      walk(object.body, [object, ...parents], (o, p) => {
        // Change return statements from
        // return (argument)
        // to
        // return [ [modifiedRefs],  ]
        if (o.type == "ReturnStatement" && getVarContext(o, p) === object) {
          return () => {
            var returnObject = ObjectExpression(
              output.map((outputName) =>
                Property(
                  Literal(newOutputNames[outputName]),
                  Identifier(outputName),
                  true
                )
              )
            );

            if (
              o.argument &&
              !(
                o.argument.type == "Identifier" &&
                o.argument.name == "undefined"
              )
            ) {
              // FIX: The return argument must be executed first so it must use 'unshift'
              returnObject.properties.unshift(
                Property(Literal(returnOutputName), clone(o.argument), true)
              );
            }

            o.argument = AssignmentExpression(
              "=",
              MemberExpression(
                Identifier(resultName),
                Identifier(propName),
                false
              ),
              returnObject
            );
          };
        }
      });

      var newBody = getBlockBody(object.body);

      // Remove 'use strict' directive
      if (newBody.length > 0 && newBody[0].directive) {
        newBody.shift();
      }

      var newFunctionExpression = FunctionExpression(
        [
          ArrayPattern(input.map((name) => Identifier(name))),
          ArrayPattern(clone(object.params)),
          Identifier(resultName),
        ],
        newBody
      );

      newFunctionExpression.async = !!object.async;
      newFunctionExpression.generator = !!object.generator;

      this.flattenedFns.push(
        VariableDeclarator(newName, newFunctionExpression)
      );

      var newParamNames: string[] = object.params.map(() =>
        this.getPlaceholder()
      );

      // result.pop()
      var getOutputMemberExpression = (outputName) =>
        MemberExpression(
          MemberExpression(Identifier(resultName), Literal(propName), true),
          Literal(outputName),
          true
        );

      // newFn.call([...refs], ...arguments, resultObject)
      var callExpression = CallExpression(Identifier(newName), [
        ArrayExpression(input.map((name) => Identifier(name))),
        ArrayExpression(newParamNames.map((name) => Identifier(name))),
        Identifier(resultName),
      ]);

      var newObjectBody: Node[] = [
        // var resultObject = {};
        VariableDeclaration([
          VariableDeclarator(resultName, ObjectExpression([])),
        ]),

        ExpressionStatement(
          newFunctionExpression.async
            ? AwaitExpression(callExpression)
            : callExpression
        ),
      ];

      var outputReversed = [...output].reverse();

      // realVar
      outputReversed.forEach((outputName) => {
        newObjectBody.push(
          ExpressionStatement(
            AssignmentExpression(
              "=",
              Identifier(outputName),
              getOutputMemberExpression(newOutputNames[outputName])
            )
          )
        );
      });

      // DECOY STATEMENTS
      var decoyKey = this.gen.generate();
      var decoyNodes = [
        // if (result.random) throw result.prop.random
        IfStatement(
          MemberExpression(
            Identifier(resultName),
            Literal(this.gen.generate()),
            true
          ),
          [
            ThrowStatement(
              NewExpression(Identifier("Error"), [
                getOutputMemberExpression(this.gen.generate()),
              ])
            ),
          ]
        ),
        // if (result.random) return true;
        IfStatement(
          MemberExpression(
            Identifier(resultName),
            Literal(this.gen.generate()),
            true
          ),
          [ReturnStatement(Literal(true))]
        ),
        // if (result.random) return result;
        IfStatement(
          MemberExpression(
            Identifier(resultName),
            Literal(this.gen.generate()),
            true
          ),
          [ReturnStatement(Identifier(resultName))]
        ),
        // if (result.random) return result.random;
        IfStatement(
          MemberExpression(Identifier(resultName), Literal(decoyKey), true),
          [
            ReturnStatement(
              MemberExpression(Identifier(resultName), Literal(decoyKey), true)
            ),
          ]
        ),
        // if(result.random1) return result.random2;
        IfStatement(
          MemberExpression(
            Identifier(resultName),
            Literal(this.gen.generate()),
            true
          ),
          [
            ReturnStatement(
              MemberExpression(
                Identifier(resultName),
                Literal(this.gen.generate()),
                true
              )
            ),
          ]
        ),
        // if(result.random) return flatFn;
        IfStatement(
          MemberExpression(
            Identifier(resultName),
            Literal(this.gen.generate()),
            true
          ),
          [ReturnStatement(Identifier(newName))]
        ),
        // if(result.random) flatFn = undefined;
        IfStatement(
          MemberExpression(
            Identifier(resultName),
            Literal(this.gen.generate()),
            true
          ),
          [
            ExpressionStatement(
              AssignmentExpression(
                "=",
                Identifier(newName),
                Identifier("undefined")
              )
            ),
          ]
        ),
        // if(!result) return;
        IfStatement(UnaryExpression("!", Identifier(resultName)), [
          ReturnStatement(),
        ]),
      ].filter(() => chance(25));

      // if (result.output) return result.output.returnValue;
      // this is the real return statement, it is always added
      decoyNodes.push(
        IfStatement(
          MemberExpression(Identifier(resultName), Literal(propName), true),
          [ReturnStatement(getOutputMemberExpression(returnOutputName))]
        )
      );

      shuffle(decoyNodes);

      newObjectBody.push(...decoyNodes);

      object.body = BlockStatement(newObjectBody);

      object.params = newParamNames.map((name) => Identifier(name));
    };
  }
}
