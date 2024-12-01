import { UNSAFE } from "../../src/constants";
import Obfuscator from "../../src/obfuscator";
import Template from "../../src/templates/template";
import * as t from "@babel/types";

test("Variant #1: Error when invalid code passed in", () => {
  var _consoleError = console.error;
  console.error = () => {};

  expect(() => {
    new Template(`#&!#Ylet{}class)--1]?|:!@#`).compile();
  }).toThrow();

  console.error = _consoleError;
});

test("Variant #2: Error on missing variables", () => {
  var _consoleError = console.error;
  console.error = () => {};

  expect(() => {
    new Template(`
        function {name}(){
          {global}.property = true;
        }
        
        `).compile({ name: "test" });
  }).toThrow();

  console.error = _consoleError;
});

test("Variant #3: Basic string interpolation", () => {
  var Base64Template = new Template(`
      function {name}(str){
        return window.btoa(str)
      }`);

  var functionDeclaration = Base64Template.single<t.FunctionDeclaration>({
    name: "decodeBase64",
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
  expect(functionDeclaration.id!.name).toStrictEqual("decodeBase64");

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  // Ensure code has no syntax errors
  eval(output);
});

test("Variant #4: AST subtree insertion", () => {
  var Base64Template = new Template(`
     function {name}(str){
       {getWindow}
      
       return {getWindowName}.btoa(str)
     }`);

  var functionDeclaration = Base64Template.single<t.FunctionDeclaration>({
    name: "decodeBase64",
    getWindowName: "newWindow",
    getWindow: Obfuscator.parseCode("var newWindow = {}").program.body,
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
  expect(functionDeclaration.body.body[0].type).toStrictEqual(
    "VariableDeclaration"
  );

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  expect(output).toContain("var newWindow={}");
  expect(output).toContain("return newWindow.btoa(str)");
});

test("Variant #5: AST subtree insertion (callback)", () => {
  var Base64Template = new Template(`
     function {name}(str){
       {getWindow}
      
       return {getWindowName}.btoa(str)
     }`);

  var functionDeclaration = Base64Template.single<t.FunctionDeclaration>({
    name: "decodeBase64",
    getWindowName: "newWindow",
    getWindow: () => {
      return Obfuscator.parseCode("var newWindow = {}").program.body;
    },
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
  expect(t.isBlockStatement(functionDeclaration.body)).toStrictEqual(true);
  expect(functionDeclaration.body.body[0].type).toStrictEqual(
    "VariableDeclaration"
  );

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  expect(output).toContain("var newWindow={}");
  expect(output).toContain("return newWindow.btoa(str)");
});

test("Variant #6: Template subtree insertion", async () => {
  var NewWindowTemplate = new Template(`
      var {NewWindowName} = {};
    `);
  var Base64Template = new Template(`
    function {name}(str){
      {NewWindowTemplate}

      return {NewWindowName}.btoa(str)
    }`);

  var functionDeclaration = Base64Template.single<t.FunctionDeclaration>({
    name: "atob",
    NewWindowTemplate: NewWindowTemplate,
    NewWindowName: "newWindow",
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
  expect(t.isBlockStatement(functionDeclaration.body)).toStrictEqual(true);
  expect(functionDeclaration.body.body[0].type).toStrictEqual(
    "VariableDeclaration"
  );

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  expect(output).toContain("var newWindow={}");
  expect(output).toContain("return newWindow.btoa(str)");
});

test("Variant #7: Template subtree insertion (callback)", async () => {
  var NewWindowTemplate = new Template(`
      var {NewWindowName} = {};
    `);
  var Base64Template = new Template(`
    function {name}(str){
      {NewWindowTemplate}

      return {NewWindowName}.btoa(str)
    }`);

  var functionDeclaration = Base64Template.single<t.FunctionDeclaration>({
    name: "atob",
    NewWindowTemplate: () => NewWindowTemplate,
    NewWindowName: "newWindow",
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
  expect(functionDeclaration.body.body[0].type).toStrictEqual(
    "VariableDeclaration"
  );

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  expect(output).toContain("var newWindow={}");
  expect(output).toContain("return newWindow.btoa(str)");
});

test("Variant #8: AST string replacement with Literal node", async () => {
  var Base64Template = new Template(`
      function {name}(str){
        return window[{property}](str)
      }`);

  var functionDeclaration = Base64Template.single({
    name: "decodeBase64",
    property: t.stringLiteral("atob"),
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  expect(output).toContain('return window["atob"](str)');
});

test("Variant #9: AST string replacement with Literal node (callback)", async () => {
  var Base64Template = new Template(`
      function {name}(str){
        return window[{property}](str)
      }`);

  var functionDeclaration = Base64Template.single({
    name: "decodeBase64",
    property: () => t.stringLiteral("atob"),
  });

  expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");

  // Generated code and check
  var output = Obfuscator.generateCode(functionDeclaration, {
    target: "node",
    compact: true,
  });

  expect(output).toContain('return window["atob"](str)');
});

test("Variant #10: Error when single() encounters multiple statements", async () => {
  var ListTemplate = new Template(`
      var a;
      var b;
      var c;
      `);

  expect(() => {
    ListTemplate.single();
  }).toThrow();
});

test("Variant #11: Handle empty statements when using single()", async () => {
  var ValidTemplate = new Template(`
      ;
      var a;
      ;
      `);

  var statement = ValidTemplate.single<t.VariableDeclaration>();
  expect(statement.type).toStrictEqual("VariableDeclaration");
});

test("Variant #12: Handle Identifier and variables name collision", async () => {
  var ValidTemplate = new Template(`
    var myVar = {myVar}
    TEST_OUTPUT = myVar;
    `);

  var file = ValidTemplate.file({
    myVar: () => t.stringLiteral("Correct Value"),
  });

  // Generate out code and test result
  var code = Obfuscator.generateCode(file);

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #13: Handle multiple AST-based variables", async () => {
  var ValidTemplate = new Template(`
    var {myVar} = {myVarValue}
    TEST_OUTPUT = {myVar};
    `);

  var file = ValidTemplate.file({
    myVar: () => t.identifier("myActualVarName"),
    myVarValue: t.stringLiteral("Correct Value"),
  });

  // Generate out code and test result
  var code = Obfuscator.generateCode(file);

  // Ensure variables got inserted
  expect(code).toContain("myActualVarName");
  expect(code).toContain("Correct Value");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #14: Add symbols to template", async () => {
  var ValidTemplate = new Template(`
    function myUnsafeFunction(){
      return eval('"Correct Value"')
    }
    TEST_OUTPUT = myUnsafeFunction();
    `).addSymbols(UNSAFE);

  var file = ValidTemplate.file();
  var statements = file.program.body;
  expect(statements.length).toStrictEqual(2);

  expect(statements[0][UNSAFE]).toStrictEqual(true);
  expect(statements[1][UNSAFE]).toStrictEqual(true);

  var code = Obfuscator.generateCode(file);

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #15: Error on duplicate node insertions", async () => {
  var InvalidTemplate = new Template(`
    var myString1 = {str}
    var myString2 = {str}
    TEST_OUTPUT = {str}
    `);

  expect(() => {
    InvalidTemplate.compile({
      str: t.stringLiteral("Duplicate node inserted"),
    });
  }).toThrow();
});
