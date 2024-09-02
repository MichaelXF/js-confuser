import Template from "./template";

export const SetFunctionLengthTemplate = new Template(`
  function {fnName}(fn, length = 1){
    Object["defineProperty"](fn, "length", {
      "value": length,
      "configurable": false
    });
    return fn;
  }
`);
