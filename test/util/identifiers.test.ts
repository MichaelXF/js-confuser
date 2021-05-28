import parseJS from "../../src/parser";
import { getIdentifierInfo } from "../../src/util/identifiers";

it("getIdentifierInfo() should determine function declarations", async () => {
  var tree = await parseJS(`function abc(){}`);

  var object = tree.body[0].id;

  expect(object.type).toStrictEqual("Identifier");

  var parents = [tree.body[0], tree.body, tree];

  var info = getIdentifierInfo(object, parents as any);

  expect(info.isFunctionDeclaration).toStrictEqual(true);
  expect(info.spec.isDefined).toStrictEqual(true);
});

it("getIdentifierInfo() should determine labels", async () => {
  var tree = await parseJS(`label: for (var i = 0; i < 0; i++ ) {}`);

  var object = tree.body[0].label;

  expect(object.type).toStrictEqual("Identifier");

  var parents = [tree.body[0], tree.body, tree];

  var info = getIdentifierInfo(object, parents as any);

  expect(info.isLabel).toStrictEqual(true);
  expect(info.spec.isReferenced).toStrictEqual(false);
});
