import { reservedIdentifiers } from "../constants";
import { ObfuscateOrder } from "../order";
import traverse, { walk } from "../traverse";
import {
  FunctionDeclaration,
  Identifier,
  ReturnStatement,
  VariableDeclaration,
  VariableDeclarator,
  CallExpression,
  MemberExpression,
  ThisExpression,
  ArrayExpression,
  ExpressionStatement,
  AssignmentExpression,
  Node,
  BlockStatement,
  ArrayPattern,
} from "../util/gen";
import { getIdentifierInfo } from "../util/identifiers";
import {
  getBlockBody,
  getVarContext,
  isFunction,
  prepend,
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
  definedNames: Map<Node, Set<string>>;

  constructor(o) {
    super(o, ObfuscateOrder.Flatten);

    this.definedNames = new Map();
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
  }

  match(object: Node, parents: Node[]) {
    return (
      isFunction(object) &&
      object.body.type == "BlockStatement" &&
      !object.generator
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      //

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
          }

          if (info.spec.isDefined) {
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

      illegal.forEach((name) => {
        defined.delete(name);
      });
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

      var newFunctionDeclaration = FunctionDeclaration(
        newName,
        clone(object.params),
        newBody
      );
      newFunctionDeclaration.async = !!object.async;
      newFunctionDeclaration.generator = !!object.generator;

      prepend(parents[parents.length - 1], newFunctionDeclaration);

      var newParamNodes = object.params.map(() =>
        Identifier(this.getPlaceholder())
      );

      // var result = newFn.call([...refs], ...arguments)
      var call = VariableDeclaration(
        VariableDeclarator(
          "result",
          CallExpression(
            MemberExpression(Identifier(newName), Identifier("call"), false),
            [ArrayExpression(input.map(Identifier)), ...newParamNodes]
          )
        )
      );

      // result.pop()
      var pop = CallExpression(
        MemberExpression(Identifier("result"), Identifier("pop"), false),
        []
      );

      // var result = newFn.call([...refs], ...arguments)
      // modified1 = result.pop();
      // modified2 = result.pop();
      // ...modifiedN = result.pop();...
      //
      // return result.pop()

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
