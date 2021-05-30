import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  
  function sum(number1, number2) {

    return number1 + number2;

  }

  console.log(sum(5, 45))
`,
  {
    target: "node",
    renameVariables: true,
    compact: false,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
