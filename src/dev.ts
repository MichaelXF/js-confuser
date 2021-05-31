import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  function TEST_FUNCTION(a,b){
    var TEST_NESTED_FUNCTION = (x,y)=>{
      console.log(x + y)
    }
    
    TEST_NESTED_FUNCTION(a,b)
  }
  
  TEST_FUNCTION(10, 15)
`,
  {
    target: "node",
    verbose: true,
    stack: true,
    compact: false,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
