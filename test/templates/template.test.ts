import Template from "../../src/templates/template";

describe("Template", () => {
  test("Variant #1: Error when invalid code passed in", () => {
    var _consoleError = console.error;
    console.error = () => {};

    expect(() => {
      Template(`#&!#Ylet{}class)--1]?|:!@#`).compile();
    }).toThrow();

    console.error = _consoleError;
  });
});
