import { ok } from "assert";
import { ExitCallback, getBlock, walk } from "../../traverse";
import {
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Literal,
  MemberExpression,
  MethodDefinition,
  Node,
  ReturnStatement,
  Super,
  ThisExpression,
} from "../../util/gen";
import { isStringLiteral } from "../../util/guard";
import { isClass, prepend } from "../../util/insert";
import { getLexicalScope } from "../../util/scope";
import Transform from "../transform";

export default class ClassExtraction extends Transform {
  constructor(o) {
    super(o);
  }

  match(object: Node, parents: Node[]): boolean {
    return (
      object.type === "ClassDeclaration" || object.type === "ClassExpression"
    );
  }

  extractKeyString(property: Node): string | null {
    if (property.key.type === "Identifier" && !property.key.computed) {
      return property.key.name;
    }

    if (isStringLiteral(property.key)) {
      return property.key.value;
    }

    return null;
  }

  transform(object: Node, parents: Node[]): void | ExitCallback {
    return () => {
      var classBody = object.body;
      var className = object.id?.type === "Identifier" && object.id?.name;

      if (!className) className = this.getPlaceholder();

      var lexicalScope = getLexicalScope(object, parents);

      var superMethodName: string;

      for (var methodDefinition of classBody.body) {
        if (
          methodDefinition.type === "MethodDefinition" &&
          methodDefinition.value.type === "FunctionExpression"
        ) {
          // Don't change constructors calling super()
          if (methodDefinition.kind === "constructor" && object.superClass)
            continue;

          var functionExpression: Node = methodDefinition.value;

          var fnName =
            className +
              "_" +
              methodDefinition.kind +
              "_" +
              this.extractKeyString(methodDefinition) || this.getPlaceholder();

          walk(
            functionExpression,
            [methodDefinition, object, ...parents],
            (o, p) => {
              if (o.type === "Super") {
                var classContext = p.find((node) => isClass(node));
                if (classContext !== object) return;

                return () => {
                  if (!superMethodName) {
                    superMethodName =
                      this.getGenerator("randomized").generate();
                  }

                  var memberExpression = p[0];
                  if (memberExpression.type === "CallExpression") {
                    throw new Error("Failed to detect super() usage");
                  }
                  ok(memberExpression.type === "MemberExpression");

                  var propertyArg = memberExpression.computed
                    ? memberExpression.property
                    : (ok(memberExpression.property.type === "Identifier"),
                      Literal(memberExpression.property.name));

                  var getSuperExpression = CallExpression(
                    MemberExpression(
                      ThisExpression(),
                      Literal(superMethodName),
                      true
                    ),
                    [propertyArg]
                  );

                  if (p[1].type === "CallExpression" && p[1].callee === p[0]) {
                    getSuperExpression = CallExpression(
                      MemberExpression(
                        getSuperExpression,
                        Literal("bind"),
                        true
                      ),
                      [ThisExpression()]
                    );
                  }

                  this.replace(p[0], getSuperExpression);
                };
              }
            }
          );

          var originalParams = functionExpression.params;
          var originalBody = functionExpression.body.body;

          functionExpression.body.body = [
            ReturnStatement(
              CallExpression(
                MemberExpression(Identifier(fnName), Literal("apply"), true),
                [ThisExpression(), Identifier("arguments")]
              )
            ),
          ];

          functionExpression.params = [];
          if (methodDefinition.kind === "set") {
            functionExpression.params = [Identifier(this.getPlaceholder())];
          }

          prepend(
            lexicalScope,
            FunctionDeclaration(fnName, [...originalParams], [...originalBody])
          );
        }
      }

      if (superMethodName) {
        classBody.body.push(
          MethodDefinition(
            Literal(superMethodName),
            FunctionExpression(
              [Identifier("key")],
              [
                ReturnStatement(
                  MemberExpression(Super(), Identifier("key"), true)
                ),
              ]
            ),
            "method",
            false,
            true
          )
        );
      }
    };
  }
}
