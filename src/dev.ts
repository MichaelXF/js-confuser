import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `

class MyClass {

  constructor(value){
    this.value = value
  }

  getValue(){
    return this.value
  }
}

var instance = new MyClass(100)
TEST_VALUE = instance.getValue()

`;

JsConfuser.obfuscate(code, {
  target: "node",
  es5: true,
  stringConcealing: true,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
