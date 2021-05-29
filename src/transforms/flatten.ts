import { ok } from "assert";
import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import Template from "../templates/template";
import traverse, { walk } from "../traverse";
import {
  FunctionDeclaration,
  Identifier,
  ReturnStatement,
  FunctionExpression,
  SwitchStatement,
  VariableDeclaration,
  VariableDeclarator,
  CallExpression,
  MemberExpression,
  ThisExpression,
  ArrayExpression,
  SwitchCase,
  Literal,
  ExpressionStatement,
  BreakStatement,
  AssignmentExpression,
  Location,
  Node,
  BlockStatement,
  SpreadElement,
  ObjectExpression,
  Property,
} from "../util/gen";
import { getDefiningIdentifier, getIdentifierInfo } from "../util/identifiers";
import {
  getBlockBody,
  getContext,
  isContext,
  isFunction,
  prepend,
} from "../util/insert";
import { VariableAnalysis } from "./identifier/renameVariables";
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
 */
export default class Flatten extends Transform {
  variableAnalysis: VariableAnalysis;
  thisNames: Map<Node, string>;

  constructor(o) {
    super(o, ObfuscateOrder.Flatten);
    this.before.push((this.variableAnalysis = new VariableAnalysis(o, true)));

    this.thisNames = new Map();
  }

  match(object: Node, parents: Node[]) {
    return (
      object.type == "FunctionDeclaration" &&
      !object.params.find((x) => x.type !== "Identifier") &&
      object.body.type === "BlockStatement"
    );
  }

  transform(object: Node, parents: Node[]) {
    ok(isContext(object));

    return () => {
      var illegal = false;
      walk(object, parents, (o, p) => {
        if (
          o.type == "ThisExpression" ||
          o.type == "SuperExpression" ||
          (o.type == "Identifier" &&
            (o.name == "this" || o.name == "arguments"))
        ) {
          illegal = true;
          return "EXIT";
        }
      });
      if (illegal) {
        return;
      }

      var newName = this.getPlaceholder();
      if (object.id && object.id.name) {
        newName = object.id.name + newName;
      }

      // Todo: Support default values and destructuring
      var params = new Set<string>();
      walk(object.params, [object, ...parents], (o, p) => {
        if (o.type == "Identifier") {
          params.add(o.name);
        }
      });

      // gets the variables this function depends on
      var references = this.variableAnalysis.references.get(object);
      var defined = this.variableAnalysis.defined.get(object);

      var depend = new Set<string>([...(references || [])]);

      if (object.$flattenDependencies) {
        object.$flattenDependencies.forEach((x) => depend.add(x));
      }
      defined.forEach((x) => references.delete(x));

      var collisions: { [paramName: string]: string } = Object.create(null);
      var newParams = new Set<string>();
      params.forEach((param) => {
        if (depend.has(param)) {
          collisions[param] = param + this.getPlaceholder();

          newParams.add(collisions[param]);
        } else {
          newParams.add(param);
        }
      });

      parents.forEach((parent) => {
        if (!parent.$flattenDependencies) {
          parent.$flattenDependencies = new Set([...depend]);
        } else {
          depend.forEach((x) => parent.$flattenDependencies.add(x));
        }
      });

      var body: Node[] =
        object.body.type == "BlockStatement"
          ? getBlockBody(object.body)
          : [object.body];
      if (object.type == "ArrowFunctionExpression" && object.expression) {
        body = [ReturnStatement(object.body)];
      }

      if (body[body.length - 1]?.type != "ReturnStatement") {
        body.push(ReturnStatement());
      }

      // fix all return statements
      walk(object.body, [object, ...parents], (o, p) => {
        if (o.type == "ReturnStatement") {
          var arrayExpression = ArrayExpression([
            ...Array.from(depend)
              .reverse()
              .map((x) => Identifier(x)),
          ]);
          if (o.argument) {
            arrayExpression.elements.unshift(o.argument);
          }
          this.replace(o, ReturnStatement(arrayExpression));
        }

        if (
          o.type == "Identifier" &&
          collisions[o.name] &&
          !reservedIdentifiers.has(o.name)
        ) {
          var info = getIdentifierInfo(o, p);
          if (info.spec.isReferenced) {
            var definedAt = getDefiningIdentifier(o, p);
            if (!definedAt || definedAt[1].indexOf(object.params) !== -1) {
              o.name = collisions[o.name];
            }
          }
        }
      });

      // create a new function that will be located at the global level
      var functionDeclaration = FunctionDeclaration(
        newName,
        [...[...depend, ...newParams].map((x) => Identifier(x))],
        [...body]
      );
      prepend(parents[parents.length - 1], functionDeclaration);

      var definingContext =
        getContext(parents[0], parents.slice(1)) || parents[parents.length - 1];
      var thisName = this.thisNames.get(definingContext);
      if (!thisName) {
        thisName = this.getPlaceholder();

        prepend(
          definingContext,
          VariableDeclaration(VariableDeclarator(thisName, ThisExpression()))
        );

        this.thisNames.set(definingContext, thisName);
      }

      // fn(ref1, ref2, ref3, ...arguments)
      var call = CallExpression(
        MemberExpression(Identifier(newName), Identifier("apply"), false),
        [
          Identifier(thisName),
          ArrayExpression([
            ...Array.from(depend).map((x) => Identifier(x)),
            SpreadElement(Identifier("arguments")),
          ]),
        ]
      );

      // result.pop()
      var pop = CallExpression(
        MemberExpression(Identifier("result"), Identifier("pop"), false),
        []
      );

      // the new body for the original function
      var newBody = [
        VariableDeclaration(VariableDeclarator("result", call)),

        ...Array.from(depend).map((name) => {
          return ExpressionStatement(
            AssignmentExpression("=", Identifier(name), pop)
          );
        }),

        ReturnStatement(pop),
      ];

      object.body = BlockStatement(newBody);
    };
  }
}
