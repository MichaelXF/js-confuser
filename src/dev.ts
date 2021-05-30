import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `

  var array = [];

  for ( var i = 1; i <= 10; i++ ) {
    array.push(i);
  }

  console.log(array);
`,
  {
    target: "node",
    controlFlowFlattening: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
