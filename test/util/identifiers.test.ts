import { ok } from "assert";
import parseJS, { parseSync } from "../../src/parser";
import traverse from "../../src/traverse";
import { Location, Node } from "../../src/util/gen";
import {
  getFunctionParameters,
  getIdentifierInfo,
  validateChain,
} from "../../src/util/identifiers";

describe("getIdentifierInfo", () => {
  test("Variant #1: Determine function declarations", async () => {
    var tree = await parseJS(`function abc(){}`);

    var object = tree.body[0].id;

    expect(object.type).toStrictEqual("Identifier");

    var parents = [tree.body[0], tree.body, tree];

    var info = getIdentifierInfo(object, parents as any);

    expect(info.isFunctionDeclaration).toStrictEqual(true);
    expect(info.spec.isDefined).toStrictEqual(true);
  });

  test("Variant #2: Determine labels", async () => {
    var tree = await parseJS(`label: for (var i = 0; i < 0; i++ ) {}`);

    var object = tree.body[0].label;

    expect(object.type).toStrictEqual("Identifier");

    var parents = [tree.body[0], tree.body, tree];

    var info = getIdentifierInfo(object, parents as any);

    expect(info.isLabel).toStrictEqual(true);
    expect(info.spec.isReferenced).toStrictEqual(false);
  });

  test("Variant #3: Error when a non-identifier node is given", async () => {
    expect(() => {
      getIdentifierInfo({ type: "Literal", value: true }, []);
    }).toThrow();
  });

  function findIdentifier(tree: Node, identifierName: string) {
    var searchLocation: Location;

    traverse(tree, (o, p) => {
      if (o.type === "Identifier" && o.name === identifierName) {
        ok(!searchLocation);
        searchLocation = [o, p];
      }
    });

    ok(searchLocation);
    return searchLocation;
  }

  test("Variant #4: Variable declaration assignment pattern", async () => {
    var tree = parseSync(`
      var [ definedIdentifier = nonDefinedIdentifier ] = [];
    `);

    var definedIdentifier = findIdentifier(tree, "definedIdentifier");
    var definedInfo = getIdentifierInfo(
      definedIdentifier[0],
      definedIdentifier[1]
    );
    expect(definedInfo.spec.isDefined).toStrictEqual(true);
    expect(definedInfo.spec.isReferenced).toStrictEqual(true);

    var nonDefinedIdentifier = findIdentifier(tree, "nonDefinedIdentifier");
    var nonDefinedInfo = getIdentifierInfo(
      nonDefinedIdentifier[0],
      nonDefinedIdentifier[1]
    );
    expect(nonDefinedInfo.spec.isDefined).toStrictEqual(false);
    expect(nonDefinedInfo.spec.isReferenced).toStrictEqual(true);
  });

  test("Variant #5: Function parameter assignment pattern", async () => {
    var tree = parseSync(`
      function myFunction(definedIdentifier = nonDefinedIdentifier) {

      }
    `);

    var myFunction = findIdentifier(tree, "myFunction");
    var myFunctionInfo = getIdentifierInfo(myFunction[0], myFunction[1]);

    expect(myFunctionInfo.isFunctionDeclaration).toStrictEqual(true);
    expect(myFunctionInfo.spec.isDefined).toStrictEqual(true);

    var definedIdentifier = findIdentifier(tree, "definedIdentifier");
    var definedInfo = getIdentifierInfo(
      definedIdentifier[0],
      definedIdentifier[1]
    );
    expect(definedInfo.spec.isDefined).toStrictEqual(true);
    expect(definedInfo.spec.isReferenced).toStrictEqual(true);

    var nonDefinedIdentifier = findIdentifier(tree, "nonDefinedIdentifier");
    var nonDefinedInfo = getIdentifierInfo(
      nonDefinedIdentifier[0],
      nonDefinedIdentifier[1]
    );
    expect(nonDefinedInfo.spec.isDefined).toStrictEqual(false);
    expect(nonDefinedInfo.spec.isReferenced).toStrictEqual(true);
  });

  test("Variant #6: Object pattern", async () => {
    var tree = parseSync(`
      var { nonDefinedIdentifier: definedIdentifier } = {};

      ( { nonModifiedIdentifier: modifiedIdentifier } = {} );
    `);

    var definedIdentifier = findIdentifier(tree, "definedIdentifier");
    var definedInfo = getIdentifierInfo(
      definedIdentifier[0],
      definedIdentifier[1]
    );
    expect(definedInfo.spec.isDefined).toStrictEqual(true);
    expect(definedInfo.spec.isReferenced).toStrictEqual(true);

    var nonDefinedIdentifier = findIdentifier(tree, "nonDefinedIdentifier");
    var nonDefinedInfo = getIdentifierInfo(
      nonDefinedIdentifier[0],
      nonDefinedIdentifier[1]
    );
    expect(nonDefinedInfo.spec.isDefined).toStrictEqual(false);
    expect(nonDefinedInfo.spec.isReferenced).toStrictEqual(false);

    var modifiedIdentifier = findIdentifier(tree, "modifiedIdentifier");
    var modifiedInfo = getIdentifierInfo(
      modifiedIdentifier[0],
      modifiedIdentifier[1]
    );
    expect(modifiedInfo.spec.isDefined).toStrictEqual(false);
    expect(modifiedInfo.spec.isModified).toStrictEqual(true);
    expect(modifiedInfo.spec.isReferenced).toStrictEqual(true);

    var nonModifiedIdentifier = findIdentifier(tree, "nonModifiedIdentifier");
    var nonModifiedInfo = getIdentifierInfo(
      nonModifiedIdentifier[0],
      nonModifiedIdentifier[1]
    );

    expect(nonModifiedInfo.spec.isDefined).toStrictEqual(false);
    expect(nonModifiedInfo.spec.isModified).toStrictEqual(false);
    expect(nonModifiedInfo.spec.isReferenced).toStrictEqual(false);
  });

  test("Variant #7: Default parameter, function expression", async () => {
    var tree = parseSync(`
      function myFunction( myParameter = function() {
        var myNestedDeclaration = true;
      } ){

      }
    `);

    var myNestedDeclaration = findIdentifier(tree, "myNestedDeclaration");
    var myNestedDeclarationInfo = getIdentifierInfo(
      myNestedDeclaration[0],
      myNestedDeclaration[1]
    );

    expect(myNestedDeclarationInfo.isVariableDeclaration).toStrictEqual(true);
    expect(myNestedDeclarationInfo.spec.isDefined).toStrictEqual(true);
    expect(myNestedDeclarationInfo.spec.isReferenced).toStrictEqual(true);
    expect(myNestedDeclarationInfo.spec.isModified).toStrictEqual(false);
  });
});

describe("validateChain", () => {
  test("Variant #1: Error when parents is not an array", () => {
    expect(() => {
      validateChain({ type: "Identifier", name: "name" }, {} as any);
    }).toThrow();
  });

  test("Variant #2: Error when object is undefined", () => {
    expect(() => {
      validateChain(undefined, []);
    }).toThrow();
  });

  test("Variant #3: Error when object is not connected to direct parent", () => {
    expect(() => {
      validateChain({ type: "Identifier", name: "name" }, [
        { type: "Program", body: [] },
      ]);
    }).toThrow();
  });
});

describe("getFunctionParameters", () => {
  test("Variant #1: Work with default values and destructuring", async () => {
    var code = `function a(A=_b,{B,[_c]:C},[D]){}`;
    var tree = await parseJS(code);

    var object = tree.body[0];
    var parents: any = [tree.body, tree];

    var locations = getFunctionParameters(object, parents);
    var names = locations.map((x) => x[0].name);

    expect(names).toStrictEqual(["A", "B", "C", "D"]);
  });

  test("Variant #2: Work with spread element", async () => {
    var code = `function a(...A){}`;
    var tree = await parseJS(code);

    var object = tree.body[0];
    var parents: any = [tree.body, tree];

    var locations = getFunctionParameters(object, parents);
    var names = locations.map((x) => x[0].name);

    expect(names).toStrictEqual(["A"]);
  });

  test("Variant #3: Normal parameters", async () => {
    var code = `function a(A,B,C,D){}`;
    var tree = await parseJS(code);

    var object = tree.body[0];
    var parents: any = [tree.body, tree];

    var locations = getFunctionParameters(object, parents);
    var names = locations.map((x) => x[0].name);

    expect(names).toStrictEqual(["A", "B", "C", "D"]);
  });

  test("Variant #4: Default values as functions", async () => {
    var code = `function a(A = function(_a){ return _a; },B = function(_a, _b = function(){return this;}){return _a + _b();},C,D){}`;
    var tree = await parseJS(code);

    var object = tree.body[0];
    var parents: any = [tree.body, tree];

    var locations = getFunctionParameters(object, parents);
    var names = locations.map((x) => x[0].name);

    expect(names).toStrictEqual(["A", "B", "C", "D"]);
  });
});
