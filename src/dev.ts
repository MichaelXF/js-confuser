import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `
console.log(1)
console.log(1)
if ( true ) {
  console.log(1)
  console.log(1)
  console.log(1)
}

if( true ) {
  console.log(1)
  console.log(1)
  console.log(1)
  console.log(1)
  if( true ) {
    console.log(1)
    console.log(1)
    console.log(1)
    console.log(1)
    if( true ) {
      console.log(1)
      console.log(1)
      console.log(1)
      console.log(1)
      if( true ) {
        console.log(1)
        console.log(1)
        console.log(1)
        console.log(1)
      }
    }
    
  }
}





`;

eval(code);

JsConfuser.obfuscate(code, {
  target: "node",
  duplicateLiteralsRemoval: true,
  compact: false,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
