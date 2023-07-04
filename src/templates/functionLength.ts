import Template from "./template";

/**
 * Helper function to set `function.length` property.
 */
export const FunctionLengthTemplate = Template(`
function {name}(functionObject, functionLength){
  Object["defineProperty"](functionObject, "length", {
    "value": functionLength,
    "configurable": true
  });
  return functionObject;
}
`);
