import { PluginObj } from "@babel/core";
import { NodePath } from "@babel/traverse";
import { PluginArg } from "./plugin";
import * as t from "@babel/types";
import { Order } from "../order";

export default ({ Plugin }: PluginArg): PluginObj => {
  const me = Plugin(Order.Preparation);

  return {
    visitor: {
      // console.log() -> console["log"]();
      MemberExpression: {
        exit(path) {
          if (!path.node.computed && path.node.property.type === "Identifier") {
            path.node.property = t.stringLiteral(path.node.property.name);
            path.node.computed = true;
          }
        },
      },

      // { key: true } -> { "key": true }
      "Property|Method": {
        exit(_path) {
          let path = _path as NodePath<t.Property | t.Method>;

          if (t.isClassPrivateProperty(path.node)) return;

          if (!path.node.computed && path.node.key.type === "Identifier") {
            path.node.key = t.stringLiteral(path.node.key.name);
            path.node.computed = true;
          }
        },
      },

      // var a,b,c -> var a; var b; var c;
      VariableDeclaration: {
        exit(path) {
          if (path.node.declarations.length > 1) {
            var extraDeclarations = path.node.declarations.slice(1);
            path.node.declarations.length = 1;
            path.insertAfter(extraDeclarations);
          }
        },
      },

      // () => a() -> () => { return a(); }
      ArrowFunctionExpression: {
        exit(path: NodePath<t.ArrowFunctionExpression>) {
          if (path.node.body.type !== "BlockStatement") {
            path.node.expression = false;
            path.node.body = t.blockStatement([
              t.returnStatement(path.node.body),
            ]);
          }
        },
      },

      // if (a) b() -> if (a) { b(); }
      // if (a) {b()} else c() -> if (a) { b(); } else { c(); }
      IfStatement: {
        exit(path) {
          if (path.node.consequent.type !== "BlockStatement") {
            path.node.consequent = t.blockStatement([path.node.consequent]);
          }

          if (
            path.node.alternate &&
            path.node.alternate.type !== "BlockStatement"
          ) {
            path.node.alternate = t.blockStatement([path.node.alternate]);
          }
        },
      },

      // for() d() -> for() { d(); }
      // while(a) b() -> while(a) { b(); }
      "ForStatement|ForInStatement|ForOfStatement|WhileStatement": {
        exit(_path) {
          var path = _path as NodePath<
            | t.ForStatement
            | t.ForInStatement
            | t.ForOfStatement
            | t.WhileStatement
          >;

          if (path.node.body.type !== "BlockStatement") {
            path.node.body = t.blockStatement([path.node.body]);
          }
        },
      },
    },
  };
};
