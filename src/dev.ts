import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  
  function TEST_FUNCTION(){

    class TEST_CLASS {
      constructor(){

      }

      getValue(){
        return "Value"
      }
    }

    var instance = new TEST_CLASS();
    input(instance.getValue());
  }

  TEST_FUNCTION()
`,
  {
    target: "browser",
    stack: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
