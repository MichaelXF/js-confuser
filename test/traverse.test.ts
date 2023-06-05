import traverse, { assertNoCircular } from "../src/traverse";
import { Node } from "../src/util/gen";

describe("traverse", function () {
  test("Variant #1: Traverse tree", function () {
    var executionOrder = [];

    var tree: Node = {
      type: "Program",
      start: 0,
      end: 27,
      body: [
        {
          type: "ExpressionStatement",
          start: 0,
          end: 27,
          expression: {
            type: "CallExpression",
            start: 0,
            end: 26,
            callee: {
              type: "MemberExpression",
              start: 0,
              end: 11,
              object: {
                type: "Identifier",
                start: 0,
                end: 7,
                name: "console",
              },
              property: {
                type: "Identifier",
                start: 8,
                end: 11,
                name: "log",
              },
              computed: false,
              optional: false,
            },
            arguments: [
              {
                type: "Literal",
                start: 12,
                end: 25,
                value: "Hello World",
                raw: '"Hello World"',
              },
            ],
            optional: false,
          },
        },
      ],
      sourceType: "module",
    };

    var literalParents;

    traverse(tree, (object, parents) => {
      if (object.type) {
        if (object.type === "Literal") {
          literalParents = parents;
        }

        executionOrder.push("ENTER:" + object.type);

        return () => {
          executionOrder.push("EXIT:" + object.type);
        };
      }
    });

    var displayString = executionOrder.join(",");

    expect(displayString).toStrictEqual(
      "ENTER:Program,ENTER:ExpressionStatement,ENTER:CallExpression,ENTER:MemberExpression,ENTER:Identifier,EXIT:Identifier,ENTER:Identifier,EXIT:Identifier,EXIT:MemberExpression,ENTER:Literal,EXIT:Literal,EXIT:CallExpression,EXIT:ExpressionStatement,EXIT:Program"
    );

    var displayLiteralParents = literalParents
      .map((x) => (Array.isArray(x) ? "(array)" : x.type))
      .join(",");
    expect(displayLiteralParents).toStrictEqual(
      "(array),CallExpression,ExpressionStatement,(array),Program"
    );
  });
});

describe("assertNoCircular", function () {
  test("Variant #1: Valid tree", function () {
    var tree = {
      a: 1,
      b: 2,
      c: 3,
      d: {
        a: 1,
        b: 2,
        c: 3,
      },
      e: [
        {
          a: 1,
          b: 2,
          c: 3,
          f: {
            a: 1,
          },
        },
      ],
    };

    expect(() => assertNoCircular(tree)).not.toThrow();
  });

  test("Variant #2: Invalid tree", function () {
    var circularRef = {};

    var tree = {
      a: 1,
      b: 2,
      c: circularRef,
      d: {
        a: 1,
        b: 2,
        c: 3,
      },
      e: [
        {
          a: 1,
          b: 2,
          c: 3,
          f: {
            a: circularRef,
          },
        },
      ],
    };

    expect(() => assertNoCircular(tree)).toThrow();
  });
});
