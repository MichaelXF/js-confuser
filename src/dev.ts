import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  
  function TEST_FUNCTION(){

    return 10;
  }

  console.log( TEST_FUNCTION() )
`,
  {
    target: "browser",
    flatten: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
