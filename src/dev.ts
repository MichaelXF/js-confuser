import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `

  while ( i <= 10 ) {
    array.push(i++);
  }
`,
  {
    target: "node",
    controlFlowFlattening: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
