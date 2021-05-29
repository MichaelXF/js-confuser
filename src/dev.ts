import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  
function TEST_FUNCTION(...a){
  return a[0] + a[1] + a[2];
}

console.log(TEST_FUNCTION(...[1,1,8]));

`,
  {
    target: "browser",
    verbose: true,
    dispatcher: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
