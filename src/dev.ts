import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

JsConfuser.obfuscate(
  `
  function fibonacci(num){   
    var a = 0, b = 1, c = num;
    while (num-- > 1) {
      c = a + b;
      a = b;
      b = c;
    }
    return c;
  }

  for ( var i = 1; i <= 25; i++ ) {
    console.log(i, fibonacci(i))
  }
`,
  {
    target: "node",
    preset: "high",
    stringEncoding: false,
  }
).then((obfuscated) => {
  console.log(obfuscated);
  eval(obfuscated);
  writeFileSync("./dev.error.js", obfuscated, { encoding: "utf-8" });
});
