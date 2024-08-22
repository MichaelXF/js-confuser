import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import { ComputeProbabilityMap } from "../../probability";
import Template from "../../templates/template";
import { isDirective, isModuleSource } from "../../util/compare";
import {
  AssignmentExpression,
  BinaryExpression,
  CallExpression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  IfStatement,
  Literal,
  MemberExpression,
  ObjectExpression,
  Property,
  ReturnStatement,
  VariableDeclaration,
  VariableDeclarator,
} from "../../util/gen";
import { append, prepend } from "../../util/insert";
import Transform from "../transform";
import { predictableFunctionTag } from "../../constants";
import {
  chance,
  choice,
  getRandomFalseExpression,
  getRandomInteger,
  getRandomString,
  splitIntoChunks,
} from "../../util/random";

function LZ_encode(c) {
  ok(c);
  var x = "charCodeAt",
    b,
    e = {},
    f = c.split(""),
    d = [],
    a = f[0],
    g = 256;
  for (b = 1; b < f.length; b++)
    (c = f[b]),
      null != e[a + c]
        ? (a += c)
        : (d.push(1 < a.length ? e[a] : a[x](0)), (e[a + c] = g), g++, (a = c));
  d.push(1 < a.length ? e[a] : a[x](0));
  for (b = 0; b < d.length; b++) d[b] = String.fromCharCode(d[b]);
  return d.join("");
}

function LZ_decode(b) {
  ok(b);
  var o,
    f,
    a,
    e = {},
    d = b.split(""),
    c = (f = d[0]),
    g = [c],
    h = (o = 256);
  for (var i = 1; i < d.length; i++)
    (a = d[i].charCodeAt(0)),
      (a = h > a ? d[i] : e[a] ? e[a] : f + c),
      g.push(a),
      (c = a.charAt(0)),
      (e[o] = f + c),
      o++,
      (f = a);
  return g.join("");
}

const DecodeTemplate = new Template(
  `function {name}(b){
    var o,
    f,
    a,
    e = {},
    d = b.split(""),
    c = (f = d[0]),
    g = [c],
    h = (o = 256);
  for (b = 1; b < d.length; b++)
    (a = d[b].charCodeAt(0)),
      (a = h > a ? d[b] : e[a] ? e[a] : f + c),
      g.push(a),
      (c = a.charAt(0)),
      (e[o] = f + c),
      o++,
      (f = a);
  return g.join("").split("{delimiter}");
  }`
);

export default class StringCompression extends Transform {
  map: Map<string, number>;
  ignore: Set<string>;
  string: string;
  delimiter = "|";

  fnName: string;

  constructor(o) {
    super(o, ObfuscateOrder.StringCompression);

    this.map = new Map();
    this.ignore = new Set();
    this.string = "";
    this.fnName = this.getPlaceholder() + predictableFunctionTag;
  }

  apply(tree) {
    super.apply(tree);

    this.string = this.string.slice(0, this.string.length - 1);
    if (!this.string.length) {
      return;
    }

    var split = this.getPlaceholder();
    var decoder = this.getPlaceholder();
    var getStringName = this.getPlaceholder() + predictableFunctionTag; // Returns the string payload

    var encoded = LZ_encode(this.string);
    if (LZ_decode(encoded) !== this.string) {
      this.error(
        new Error(
          "String failed to be decoded. Try disabling the 'stringCompression' option."
        )
      );
    }

    var getStringParamName = this.getPlaceholder();
    var decoderParamName = this.getPlaceholder();

    var callExpression = CallExpression(Identifier(decoderParamName), [
      CallExpression(Identifier(getStringParamName), []),
    ]);

    prepend(
      tree,
      VariableDeclaration(
        VariableDeclarator(
          split,
          CallExpression(
            FunctionExpression(
              [Identifier(getStringParamName), Identifier(decoderParamName)],
              [ReturnStatement(callExpression)]
            ),
            [Identifier(getStringName), Identifier(decoder)]
          )
        )
      )
    );

    var keys = new Set<string>();
    var keysToMake = getRandomInteger(4, 14);
    for (var i = 0; i < keysToMake; i++) {
      keys.add(getRandomString(getRandomInteger(4, 14)));
    }

    var objectExpression = ObjectExpression(
      Array.from(keys).map((key) => {
        return Property(Literal(key), getRandomFalseExpression(), true);
      })
    );

    // Get string function
    var getStringBody = [];
    var splits = splitIntoChunks(
      encoded,
      Math.floor(encoded.length / getRandomInteger(3, 6))
    );

    getStringBody.push(
      VariableDeclaration(VariableDeclarator("str", Literal(splits.shift())))
    );

    getStringBody.push(
      VariableDeclaration(VariableDeclarator("objectToTest", objectExpression))
    );

    const addIfStatement = (testingFor, literalValueToBeAppended) => {
      getStringBody.push(
        IfStatement(
          BinaryExpression(
            "in",
            Literal(testingFor),
            Identifier("objectToTest")
          ),
          [
            ExpressionStatement(
              AssignmentExpression(
                "+=",
                Identifier("str"),
                Literal(literalValueToBeAppended)
              )
            ),
          ]
        )
      );
    };

    for (const split of splits) {
      if (chance(50)) {
        var fakeKey;
        do {
          fakeKey = getRandomString(getRandomInteger(4, 14));
        } while (keys.has(fakeKey) || fakeKey in {});

        addIfStatement(fakeKey, getRandomString(split.length));
      }

      addIfStatement(choice(Array.from(keys)), split);
    }

    // Return computed string
    getStringBody.push(ReturnStatement(Identifier("str")));

    append(tree, FunctionDeclaration(getStringName, [], getStringBody));

    append(
      tree,
      FunctionDeclaration(
        this.fnName,
        [Identifier("index")],
        [
          ReturnStatement(
            MemberExpression(Identifier(split), Identifier("index"), true)
          ),
        ]
      )
    );

    append(
      tree,
      DecodeTemplate.single({ name: decoder, delimiter: this.delimiter })
    );
  }

  match(object, parents) {
    return (
      object.type == "Literal" &&
      typeof object.value === "string" &&
      object.value &&
      object.value.length > 3 &&
      !isDirective(object, parents) &&
      !isModuleSource(object, parents) &&
      !parents.find((x) => x.$multiTransformSkip)
    );
  }

  transform(object, parents) {
    if (!object.value) {
      return;
    }
    if (
      this.ignore.has(object.value) ||
      object.value.includes(this.delimiter)
    ) {
      return;
    }

    if (
      !parents[0] ||
      (parents[0].type == "CallExpression" &&
        parents[0].callee.type == "Identifier" &&
        parents[0].callee.name == this.fnName)
    ) {
      return;
    }

    if (
      !ComputeProbabilityMap(
        this.options.stringCompression,
        (x) => x,
        object.value
      )
    ) {
      return;
    }

    var index = this.map.get(object.value);

    // New string, add it!
    if (typeof index !== "number") {
      // Ensure the string gets properly decoded
      if (LZ_decode(LZ_encode(object.value)) !== object.value) {
        this.ignore.add(object.value);
        return;
      }

      index = this.map.size;
      this.map.set(object.value, index);
      this.string += object.value + this.delimiter;
    }
    ok(typeof index === "number");

    return () => {
      this.replaceIdentifierOrLiteral(
        object,
        CallExpression(Identifier(this.fnName), [Literal(index)]),
        parents
      );
    };
  }
}
