import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

JsConfuser.obfuscate(
  `

  function test_function(){
    var array = [];

    for ( var i = 1; i <= 10; i++ ) {
      array.push(i);
    }

    console.log(array);
  }

  test_function()
`,
  {
    target: "node",
    compact: false,
    stack: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
