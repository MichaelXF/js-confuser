import { compileJsSync } from "../../src/compiler";
import { parseSnippet } from "../../src/parser";
import Template from "../../src/templates/template";

describe("Template", () => {
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

  test("Variant #3: Allow AST to be passed in", () => {
    var Base64Template = new Template(`
     function {name}(str){
       {getWindow}
      
       return {getWindowName}.btoa(str)
     }`);

    var functionDeclaration = Base64Template.single({
      name: "atob",
      getWindowName: "newWindow",
      getWindow: () => {
        return parseSnippet("var newWindow = {}").body;
      },
    });

    expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
    expect(functionDeclaration.body.body[0].type).toStrictEqual(
      "VariableDeclaration"
    );

    // Generated code and check
    var output = compileJsSync(functionDeclaration, {
      target: "node",
      compact: true,
    });

    expect(output).toContain("var newWindow={}");
    expect(output).toContain("return newWindow.btoa(str)");
  });

  test("Variant #4: Allow Template to be passed in", async () => {
    var NewWindowTemplate = new Template(`
      var {NewWindowName} = {};
    `);
    var Base64Template = new Template(`
    function {name}(str){
      {NewWindowTemplate}

      return {NewWindowName}.btoa(str)
    }`);

    var functionDeclaration = Base64Template.single({
      name: "atob",
      NewWindowTemplate: NewWindowTemplate,
      NewWindowName: "newWindow",
    });

    expect(functionDeclaration.type).toStrictEqual("FunctionDeclaration");
    expect(functionDeclaration.body.body[0].type).toStrictEqual(
      "VariableDeclaration"
    );

    // Generated code and check
    var output = compileJsSync(functionDeclaration, {
      target: "node",
      compact: true,
    });

    expect(output).toContain("var newWindow={}");
    expect(output).toContain("return newWindow.btoa(str)");
  });
});
