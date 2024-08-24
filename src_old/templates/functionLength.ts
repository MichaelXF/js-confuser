import Template from "./template";

/**
 * Helper function to set `function.length` property.
 */
export const FunctionLengthTemplate = new Template(
  `
function {name}(functionObject, functionLength){
  {ObjectDefineProperty}(functionObject, "length", {
    "value": functionLength,
    "configurable": true
  });
  return functionObject;
}
`,
  `
function {name}(functionObject, functionLength){
  return {ObjectDefineProperty}(functionObject, "length", {
    "value": functionLength,
    "configurable": true
  });
}
`,
  `
function {name}(functionObject, functionLength){
  return {ObjectDefineProperty}["call"](null, functionObject, "length", {
    "value": functionLength,
    "configurable": true
  });
}
`
);
