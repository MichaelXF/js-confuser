import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

// const Cash = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  var array = [1,2,3,4,5,6,7,8,9,10];
`,
  {
    target: "browser",
    shuffle: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);
});
