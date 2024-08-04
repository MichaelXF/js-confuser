import { ok } from "assert";
import {
  noRenameVariablePrefix,
  predictableFunctionTag,
  reservedIdentifiers,
} from "../constants";
import { ObfuscateOrder } from "../order";
import { walk } from "../traverse";
import {
  Identifier,
  ReturnStatement,
  VariableDeclaration,
  VariableDeclarator,
  CallExpression,
  MemberExpression,
  ExpressionStatement,
  AssignmentExpression,
  Node,
  BlockStatement,
  ArrayPattern,
  FunctionExpression,
  ObjectExpression,
  Property,
  Literal,
  AwaitExpression,
  FunctionDeclaration,
  SpreadElement,
  UnaryExpression,
  RestElement,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import {
  getBlockBody,
  prepend,
  clone,
  getDefiningContext,
  computeFunctionLength,
} from "../util/insert";
import { shuffle } from "../util/random";
import Transform from "./transform";
import { FunctionLengthTemplate } from "../templates/functionLength";
import { ObjectDefineProperty } from "../templates/globals";

/**
 * Flatten takes functions and isolates them from their original scope, and brings it to the top level of the program.
 *
 * An additional `flatObject` parameter is passed in, giving access to the original scoped variables.
 *
 * The `flatObject` uses `get` and `set` properties to allow easy an AST transformation:
 *
 * ```js
 * // Input
 * function myFunction(myParam){
 *    modified = true;
 *    if(reference) {
 *
 *    }
 *    ...
 *    console.log(myParam);
 * }
 *
 * // Output
 * function myFunction_flat([myParam], flatObject){
 *    flatObject["set_modified"] = true;
 *    if(flatObject["get_reference"]) {
 *
 *    }
 *    ...
 *    console.log(myParam)
 * }
 *
 * function myFunction(){
 *    var flatObject = {
 *        set set_modified(v) { modified = v }
 *        get get_reference() { return reference }
 *    }
 *    return myFunction_flat([...arguments], flatObject)
 * }
 * ```
 *
 * Flatten is used to make functions eligible for the RGF transformation.
 *
 * - `myFunction_flat` is now eligible because it does not rely on outside scoped variables
 */
export default class Flatten extends Transform {
  isDebug = false;

  definedNames: Map<Node, Set<string>>;

  // Array of FunctionDeclaration nodes
  flattenedFns: Node[];
  gen: ReturnType<Transform["getGenerator"]>;

  functionLengthName: string;

  constructor(o) {
    super(o, ObfuscateOrder.Flatten);

    this.definedNames = new Map();
    this.flattenedFns = [];
    this.gen = this.getGenerator("mangled");

    if (this.isDebug) {
      console.warn("Flatten debug mode");
    }
  }

  apply(tree) {
    super.apply(tree);

    if (this.flattenedFns.length) {
      prepend(tree, ...this.flattenedFns);
    }
  }

  match(object: Node, parents: Node[]) {
    return (
      (object.type == "FunctionDeclaration" ||
        object.type === "FunctionExpression") &&
      object.body.type == "BlockStatement" &&
      !object.$requiresEval &&
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
          (parents[0].kind !== "init" || parents[0].method)
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
        currentFnName = currentFnName || String(parents[0]?.key?.name);
      }

      if (!currentFnName) currentFnName = "unnamed";

      var definedMap = new Map<Node, Set<string>>();

      var illegal = new Set<string>();
      var isIllegal = false;

      var identifierNodes: [
        Node,
        Node[],
        ReturnType<typeof getIdentifierInfo>
      ][] = [];

      walk(object, parents, (o, p) => {
        if (
          (o.type === "Identifier" && o.name === "arguments") ||
          (o.type === "UnaryExpression" && o.operator === "delete") ||
          o.type == "ThisExpression" ||
          o.type == "Super" ||
          o.type == "MetaProperty"
        ) {
          isIllegal = true;
          return "EXIT";
        }

        if (
          o.type == "Identifier" &&
          o !== object.id &&
          !this.options.globalVariables.has(o.name) &&
          !reservedIdentifiers.has(o.name)
        ) {
          var info = getIdentifierInfo(o, p);
          if (!info.spec.isReferenced) {
            return;
          }

          if (
            info.spec.isExported ||
            o.name.startsWith(noRenameVariablePrefix)
          ) {
            illegal.add(o.name);

            return;
          }

          if (info.spec.isDefined) {
            var definingContext = getDefiningContext(o, p);

            if (!definedMap.has(definingContext)) {
              definedMap.set(definingContext, new Set([o.name]));
            } else {
              definedMap.get(definingContext).add(o.name);
            }
            return;
          }

          var isDefined = p.find(
            (x) => definedMap.has(x) && definedMap.get(x).has(o.name)
          );

          if (!isDefined) {
            identifierNodes.push([o, p, info]);
          }
        }

        if (o.type == "TryStatement") {
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

      var newFnName =
        this.getPlaceholder() +
        "_flat_" +
        currentFnName +
        predictableFunctionTag;
      var flatObjectName = this.getPlaceholder() + "_flat_object";

      const getFlatObjectMember = (propertyName: string) => {
        return MemberExpression(
          Identifier(flatObjectName),
          Literal(propertyName),
          true
        );
      };

      var getterPropNames: { [identifierName: string]: string } =
        Object.create(null);
      var setterPropNames: { [identifierName: string]: string } =
        Object.create(null);
      var typeofPropNames: { [identifierName: string]: string } =
        Object.create(null);
      var callPropNames: { [identifierName: string]: string } =
        Object.create(null);

      for (var [o, p, info] of identifierNodes) {
        var identifierName: string = o.name;
        if (
          p.find(
            (x) => definedMap.has(x) && definedMap.get(x).has(identifierName)
          )
        )
          continue;

        ok(!info.spec.isDefined);

        var type = info.spec.isModified ? "setter" : "getter";

        switch (type) {
          case "setter":
            var setterPropName = setterPropNames[identifierName];
            if (typeof setterPropName === "undefined") {
              // No getter function made yet, make it (Try to re-use getter name if available)
              setterPropName =
                getterPropNames[identifierName] ||
                (this.isDebug ? "set_" + identifierName : this.gen.generate());
              setterPropNames[identifierName] = setterPropName;
            }

            // If an update expression, ensure a getter function is also available. Ex: a++
            if (p[0].type === "UpdateExpression") {
              getterPropNames[identifierName] = setterPropName;
            } else {
              // If assignment on member expression, ensure a getter function is also available: Ex. myObject.property = ...
              var assignmentIndex = p.findIndex(
                (x) => x.type === "AssignmentExpression"
              );
              if (
                assignmentIndex !== -1 &&
                p[assignmentIndex].left.type !== "Identifier"
              ) {
                getterPropNames[identifierName] = setterPropName;
              }
            }

            // calls flatObject.set_identifier_value(newValue)
            this.replace(o, getFlatObjectMember(setterPropName));
            break;

          case "getter":
            var getterPropName = getterPropNames[identifierName];
            if (typeof getterPropName === "undefined") {
              // No getter function made yet, make it (Try to re-use setter name if available)
              getterPropName =
                setterPropNames[identifierName] ||
                (this.isDebug ? "get_" + identifierName : this.gen.generate());
              getterPropNames[identifierName] = getterPropName;
            }

            // Typeof expression check
            if (
              p[0].type === "UnaryExpression" &&
              p[0].operator === "typeof" &&
              p[0].argument === o
            ) {
              var typeofPropName = typeofPropNames[identifierName];
              if (typeof typeofPropName === "undefined") {
                // No typeof getter function made yet, make it (Don't re-use getter/setter names)
                typeofPropName = this.isDebug
                  ? "get_typeof_" + identifierName
                  : this.gen.generate();
                typeofPropNames[identifierName] = typeofPropName;
              }

              // Replace the entire unary expression not just the identifier node
              // calls flatObject.get_typeof_identifier()
              this.replace(p[0], getFlatObjectMember(typeofPropName));
              break;
            }

            // Bound call-expression check
            if (p[0].type === "CallExpression" && p[0].callee === o) {
              var callPropName = callPropNames[identifierName];
              if (typeof callPropName === "undefined") {
                callPropName = this.isDebug
                  ? "call_" + identifierName
                  : this.gen.generate();
                callPropNames[identifierName] = callPropName;
              }

              // Replace the entire call expression not just the identifier node
              // calls flatObject.call_identifier(...arguments)
              this.replace(
                p[0],
                CallExpression(
                  getFlatObjectMember(callPropName),
                  p[0].arguments
                )
              );
              break;
            }

            // calls flatObject.get_identifier_value()
            this.replace(o, getFlatObjectMember(getterPropName));
            break;
        }
      }

      // Create the getter and setter functions
      var flatObjectProperties: Node[] = [];

      // Getter functions
      for (var identifierName in getterPropNames) {
        var getterPropName = getterPropNames[identifierName];

        flatObjectProperties.push(
          Property(
            Literal(getterPropName),
            FunctionExpression(
              [],
              [ReturnStatement(Identifier(identifierName))]
            ),
            true,
            "get"
          )
        );
      }

      // Get typeof functions
      for (var identifierName in typeofPropNames) {
        var typeofPropName = typeofPropNames[identifierName];

        flatObjectProperties.push(
          Property(
            Literal(typeofPropName),
            FunctionExpression(
              [],
              [
                ReturnStatement(
                  UnaryExpression("typeof", Identifier(identifierName))
                ),
              ]
            ),
            true,
            "get"
          )
        );
      }

      // Call functions
      for (var identifierName in callPropNames) {
        var callPropName = callPropNames[identifierName];
        var argumentsName = this.getPlaceholder();
        flatObjectProperties.push(
          Property(
            Literal(callPropName),
            FunctionExpression(
              [RestElement(Identifier(argumentsName))],
              [
                ReturnStatement(
                  CallExpression(Identifier(identifierName), [
                    SpreadElement(Identifier(argumentsName)),
                  ])
                ),
              ]
            ),
            true
          )
        );
      }

      // Setter functions
      for (var identifierName in setterPropNames) {
        var setterPropName = setterPropNames[identifierName];
        var newValueParameterName = this.getPlaceholder();

        flatObjectProperties.push(
          Property(
            Literal(setterPropName),
            FunctionExpression(
              [Identifier(newValueParameterName)],
              [
                ExpressionStatement(
                  AssignmentExpression(
                    "=",
                    Identifier(identifierName),
                    Identifier(newValueParameterName)
                  )
                ),
              ]
            ),
            true,
            "set"
          )
        );
      }

      if (!this.isDebug) {
        shuffle(flatObjectProperties);
      }

      var newBody = getBlockBody(object.body);

      // Remove 'use strict' directive
      if (newBody.length > 0 && newBody[0].directive) {
        newBody.shift();
      }

      var newFunctionDeclaration = FunctionDeclaration(
        newFnName,
        [ArrayPattern(clone(object.params)), Identifier(flatObjectName)],
        newBody
      );

      newFunctionDeclaration.async = !!object.async;
      newFunctionDeclaration.generator = false;

      this.flattenedFns.push(newFunctionDeclaration);

      var argumentsName = this.getPlaceholder();

      // newFn.call([...arguments], flatObject)
      var callExpression = CallExpression(Identifier(newFnName), [
        Identifier(argumentsName),
        Identifier(flatObjectName),
      ]);

      var newObjectBody: Node[] = [
        // var flatObject = { get(), set() };
        VariableDeclaration([
          VariableDeclarator(
            flatObjectName,
            ObjectExpression(flatObjectProperties)
          ),
        ]),

        ReturnStatement(
          newFunctionDeclaration.async
            ? AwaitExpression(callExpression)
            : callExpression
        ),
      ];

      object.body = BlockStatement(newObjectBody);

      // Preserve function.length property
      var originalFunctionLength = computeFunctionLength(object.params);

      object.params = [RestElement(Identifier(argumentsName))];

      if (this.options.preserveFunctionLength && originalFunctionLength !== 0) {
        if (!this.functionLengthName) {
          this.functionLengthName = this.getPlaceholder();

          prepend(
            parents[parents.length - 1] || object,
            FunctionLengthTemplate.single({
              name: this.functionLengthName,
              ObjectDefineProperty: this.createInitVariable(
                ObjectDefineProperty,
                parents
              ),
            })
          );
        }

        if (object.type === "FunctionDeclaration") {
          var body = parents[0];
          if (Array.isArray(body)) {
            var index = body.indexOf(object);

            body.splice(
              index + 1,
              0,
              ExpressionStatement(
                CallExpression(Identifier(this.functionLengthName), [
                  Identifier(object.id.name),
                  Literal(originalFunctionLength),
                ])
              )
            );
          }
        } else {
          ok(object.type === "FunctionExpression");
          this.replace(
            object,
            CallExpression(Identifier(this.functionLengthName), [
              { ...object },
              Literal(originalFunctionLength),
            ])
          );
        }
      }
    };
  }
}
