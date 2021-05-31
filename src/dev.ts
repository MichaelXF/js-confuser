import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `

  var result = 1 + 1;
  console.log("1 + 1 is " + result);
  console.log("The source code is only three lines long!");
  
  
`,
  {
    target: "node",
    preset: "high",
    shuffle: "hash",
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
