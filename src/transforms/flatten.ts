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
  ArrayPattern,
} from "../util/gen";
import {
  getDefiningIdentifier,
  getFunctionParameters,
  getIdentifierInfo,
} from "../util/identifiers";
import {
  getBlockBody,
  getVarContext,
  isVarContext,
  isFunction,
  prepend,
  getDefiningContext,
  clone,
} from "../util/insert";
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
  constructor(o) {
    super(o, ObfuscateOrder.Flatten);
  }

  match(object: Node, parents: Node[]) {
    return isFunction(object) && object.body.type == "BlockStatement";
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      //

      var defined = new Set<string>();
      var references = new Set<string>();
      var modified = new Set<string>();

      var illegal = new Set<string>();

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

          if (info.spec.isDefined) {
            defined.add(o.name);
          } else if (info.spec.isModified) {
            modified.add(o.name);
          } else if (info.spec.isReferenced) {
            references.add(o.name);
          }
        }

        if (o.type == "Identifier") {
          if (o.name == "arguments") {
            illegal.add("1");
          }
        } else if (o.type == "ThisExpression") {
          illegal.add("1");
        } else if (o.type == "Super") {
          illegal.add("1");
        } else if (o.type == "MetaProperty") {
          illegal.add("1");
        }
      });

      illegal.forEach((name) => {
        defined.delete(name);
      });
      defined.forEach((name) => {
        references.delete(name);
        modified.delete(name);
      });

      // console.log(object.id.name, illegal, references);

      var input = Array.from(new Set([...modified, ...references]));
      var output = Array.from(modified);

      if (illegal.size) {
        return;
      }

      var newName =
        "flatten" +
        this.getPlaceholder() +
        "_" +
        ((object.id && object.id.name) || "fn");

      getBlockBody(object.body).push(ReturnStatement());
      walk(object.body, [object, ...parents], (o, p) => {
        return () => {
          if (o.type == "ReturnStatement" && getVarContext(o, p) === object) {
            var elements = output.map(Identifier);
            if (
              o.argument &&
              !(
                o.argument.type == "Identifier" &&
                o.argument.name == "undefined"
              )
            ) {
              elements.unshift(clone(o.argument));
            }

            o.argument = ArrayExpression(elements);
          }
        };
      });

      var newBody = getBlockBody(object.body);

      if (input.length) {
        newBody.unshift(
          VariableDeclaration(
            VariableDeclarator(
              ArrayPattern(input.map(Identifier)),
              ThisExpression()
            )
          )
        );
      }

      prepend(
        parents[parents.length - 1],
        FunctionDeclaration(newName, clone(object.params), newBody)
      );

      var newParamNodes = object.params.map(() =>
        Identifier(this.getPlaceholder())
      );

      var call = VariableDeclaration(
        VariableDeclarator(
          "result",
          CallExpression(
            MemberExpression(Identifier(newName), Identifier("call"), false),
            [ArrayExpression(input.map(Identifier)), ...newParamNodes]
          )
        )
      );

      var pop = CallExpression(
        MemberExpression(Identifier("result"), Identifier("pop"), false),
        []
      );

      object.body = BlockStatement([
        call,
        ...[...output].reverse().map((name) => {
          return ExpressionStatement(
            AssignmentExpression("=", Identifier(name), clone(pop))
          );
        }),

        ReturnStatement(clone(pop)),
      ]);

      object.params = newParamNodes;
    };
  }
}
