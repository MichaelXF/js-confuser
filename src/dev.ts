import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `

function myFunction(){
  
  var a= new ABC();
  console.log(a)

  return;
  function ABC(){
    return 1;
  }
}

myFunction()

`;

JsConfuser.obfuscate(code, {
  target: "node",
  minify: true,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
