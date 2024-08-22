import { ok } from "assert";
import { ObfuscateOrder } from "../../order";
import Template from "../../templates/template";
import { getBlock } from "../../traverse";
import { isDirective, isModuleSource } from "../../util/compare";
import {
  ArrayExpression,
  CallExpression,
  Identifier,
  Literal,
  MemberExpression,
  Node,
  ObjectExpression,
  Property,
  VariableDeclaration,
  VariableDeclarator,
} from "../../util/gen";
import { append, prepend } from "../../util/insert";
import {
  chance,
  choice,
  getRandomInteger,
  getRandomString,
  shuffle,
} from "../../util/random";
import Transform from "../transform";
import {
  EncodingImplementation,
  EncodingImplementations,
  createEncodingImplementation,
  hasAllEncodings,
} from "./encoding";
import { ComputeProbabilityMap } from "../../probability";
import {
  BufferToStringTemplate,
  createGetGlobalTemplate,
} from "../../templates/bufferToString";
import { criticalFunctionTag, predictableFunctionTag } from "../../constants";

interface FunctionObject {
  block: Node;
  fnName: string;
  encodingImplementation: EncodingImplementation;
}

export default class StringConcealing extends Transform {
  arrayExpression: Node;
  set: Set<string>;
  index: { [str: string]: [number, string, Node] }; // index, fnName, block

  arrayName = this.getPlaceholder();
  ignore = new Set<string>();
  variablesMade = 1;
  gen: ReturnType<Transform["getGenerator"]>;

  functionObjects: FunctionObject[] = [];

  constructor(o) {
    super(o, ObfuscateOrder.StringConcealing);

    this.set = new Set();
    this.index = Object.create(null);
    this.arrayExpression = ArrayExpression([]);
    this.gen = this.getGenerator();
  }

  apply(tree) {
    super.apply(tree);

    // Pad array with useless strings
    var dead = getRandomInteger(50, 200);
    for (var i = 0; i < dead; i++) {
      var str = getRandomString(getRandomInteger(5, 40));
      var fn = this.transform(Literal(str), [tree]);
      if (fn) {
        fn();
      }
    }

    var cacheName = this.getPlaceholder();
    var bufferToStringName = this.getPlaceholder() + predictableFunctionTag;

    // This helper functions convert UInt8 Array to UTf-string
    prepend(
      tree,
      ...BufferToStringTemplate.compile({
        name: bufferToStringName,
        getGlobalFnName: this.getPlaceholder() + predictableFunctionTag,
        GetGlobalTemplate: createGetGlobalTemplate(this, tree, []),
      })
    );

    for (var functionObject of this.functionObjects) {
      var {
        block,
        fnName: getterFnName,
        encodingImplementation,
      } = functionObject;

      var decodeFn =
        this.getPlaceholder() + predictableFunctionTag + criticalFunctionTag;

      append(
        block,
        encodingImplementation.template.single({
          __fnName__: decodeFn,
          __bufferToString__: bufferToStringName,
        })
      );
      // All these are fake and never ran
      var ifStatements = new Template(`if ( z == x ) {
          return y[${cacheName}[z]] = ${getterFnName}(x, y);
        }
        if ( y ) {
          [b, y] = [a(b), x || z]
          return ${getterFnName}(x, b, z)
        }
        if ( z && a !== ${decodeFn} ) {
          ${getterFnName} = ${decodeFn}
          return ${getterFnName}(x, -1, z, a, b)
        }
        if ( a === ${getterFnName} ) {
          ${decodeFn} = y
          return ${decodeFn}(z)
        }
        if( a === undefined ) {
          ${getterFnName} = b
        }
        if( z == a ) {
          return y ? x[b[y]] : ${cacheName}[x] || (z=(b[x] || a), ${cacheName}[x] = z(${this.arrayName}[x]))
        }
        `).compile();

      // Not all fake if-statements are needed
      ifStatements = ifStatements.filter(() => chance(50));

      // This one is always used
      ifStatements.push(
        new Template(`
      if ( x !== y ) {
        return b[x] || (b[x] = a(${this.arrayName}[x]))
      }
      `).single()
      );

      shuffle(ifStatements);

      var varDeclaration = new Template(`
      var ${getterFnName} = (x, y, z, a, b)=>{
        if(typeof a === "undefined") {
          a = ${decodeFn}
        }
        if(typeof b === "undefined") {
          b = ${cacheName}
        }
      }
      `).single();

      varDeclaration.declarations[0].init.body.body.push(...ifStatements);

      prepend(block, varDeclaration);
    }

    prepend(
      tree,
      VariableDeclaration([
        VariableDeclarator(cacheName, ArrayExpression([])),
        VariableDeclarator(this.arrayName, this.arrayExpression),
      ])
    );
  }

  match(object, parents) {
    return (
      object.type == "Literal" &&
      typeof object.value === "string" &&
      object.value.length >= 3 &&
      !isModuleSource(object, parents) &&
      !isDirective(object, parents) //&&
      /*!parents.find((x) => x.$multiTransformSkip)*/
    );
  }

  transform(object: Node, parents: Node[]) {
    return () => {
      // Empty strings are discarded
      if (
        !object.value ||
        this.ignore.has(object.value) ||
        object.value.length == 0
      ) {
        return;
      }

      // Allow user to choose which strings get changed
      if (
        !ComputeProbabilityMap(
          this.options.stringConcealing,
          (x) => x,
          object.value
        )
      ) {
        return;
      }

      var currentBlock = getBlock(object, parents);

      // Find created functions
      var functionObjects: FunctionObject[] = parents
        .filter((node) => node.$stringConcealingFunctionObject)
        .map((item) => item.$stringConcealingFunctionObject);

      // Choose random functionObject to use
      var functionObject = choice(functionObjects);

      if (
        !functionObject ||
        (!hasAllEncodings() &&
          chance(25 / this.functionObjects.length) &&
          !currentBlock.$stringConcealingFunctionObject)
      ) {
        // No functions, create one

        var newFunctionObject: FunctionObject = {
          block: currentBlock,
          encodingImplementation: createEncodingImplementation(),
          fnName: this.getPlaceholder() + predictableFunctionTag,
        };

        this.functionObjects.push(newFunctionObject);
        currentBlock.$stringConcealingFunctionObject = newFunctionObject;
        functionObject = newFunctionObject;
      }

      var { fnName, encodingImplementation } = functionObject;

      var index = -1;

      // String already decoded?
      if (this.set.has(object.value)) {
        var row = this.index[object.value];
        if (parents.includes(row[2])) {
          [index, fnName] = row;
          ok(typeof index === "number");
        }
      }

      if (index == -1) {
        // The decode function must return correct result
        var encoded = encodingImplementation.encode(object.value);
        if (encodingImplementation.decode(encoded) !== object.value) {
          this.ignore.add(object.value);
          this.warn(
            encodingImplementation.identity,
            object.value.slice(0, 100)
          );
          delete EncodingImplementations[encodingImplementation.identity];

          return;
        }

        this.arrayExpression.elements.push(Literal(encoded));
        index = this.arrayExpression.elements.length - 1;
        this.index[object.value] = [index, fnName, currentBlock];

        this.set.add(object.value);
      }

      ok(index != -1, "index == -1");

      var callExpr = CallExpression(Identifier(fnName), [Literal(index)]);

      // use `.apply` to fool automated de-obfuscators
      if (chance(10)) {
        callExpr = CallExpression(
          MemberExpression(Identifier(fnName), Literal("apply"), true),
          [Identifier("undefined"), ArrayExpression([Literal(index)])]
        );
      }

      // use `.call`
      else if (chance(10)) {
        callExpr = CallExpression(
          MemberExpression(Identifier(fnName), Literal("call"), true),
          [Identifier("undefined"), Literal(index)]
        );
      }

      var referenceType = "call";
      if (parents.length && chance(50 - this.variablesMade)) {
        referenceType = "constantReference";
      }

      var newExpr: Node = callExpr;

      if (referenceType === "constantReference") {
        // Define the string earlier, reference the name here
        this.variablesMade++;

        var constantReferenceType = choice(["variable", "array", "object"]);

        var place = currentBlock;
        if (!place) {
          this.error(new Error("No lexical block to insert code"));
        }

        switch (constantReferenceType) {
          case "variable":
            var name = this.getPlaceholder();

            prepend(
              place,
              VariableDeclaration(VariableDeclarator(name, callExpr))
            );

            newExpr = Identifier(name);
            break;
          case "array":
            if (!place.$stringConcealingArray) {
              place.$stringConcealingArray = ArrayExpression([]);
              place.$stringConcealingArrayName = this.getPlaceholder();

              prepend(
                place,
                VariableDeclaration(
                  VariableDeclarator(
                    place.$stringConcealingArrayName,
                    place.$stringConcealingArray
                  )
                )
              );
            }

            var arrayIndex = place.$stringConcealingArray.elements.length;

            place.$stringConcealingArray.elements.push(callExpr);

            var memberExpression = MemberExpression(
              Identifier(place.$stringConcealingArrayName),
              Literal(arrayIndex),
              true
            );

            newExpr = memberExpression;
            break;
          case "object":
            if (!place.$stringConcealingObject) {
              place.$stringConcealingObject = ObjectExpression([]);
              place.$stringConcealingObjectName = this.getPlaceholder();

              prepend(
                place,
                VariableDeclaration(
                  VariableDeclarator(
                    place.$stringConcealingObjectName,
                    place.$stringConcealingObject
                  )
                )
              );
            }

            var propName = this.gen.generate();
            var property = Property(Literal(propName), callExpr, true);
            place.$stringConcealingObject.properties.push(property);

            var memberExpression = MemberExpression(
              Identifier(place.$stringConcealingObjectName),
              Literal(propName),
              true
            );

            newExpr = memberExpression;
            break;
        }
      }

      this.replaceIdentifierOrLiteral(object, newExpr, parents);
    };
  }
}
