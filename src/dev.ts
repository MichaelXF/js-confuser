import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `
  "use strict"

  var ABC = "use strict";

  function sum(number1, number2) {

    return number1 + number2;

  }

  console.log(sum(5, 45))
`,
  {
    target: "node",
    renameVariables: true,
    compact: false,
    stringConcealing: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
