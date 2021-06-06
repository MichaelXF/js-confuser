import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `

var a = 1, b= 0;
switch(a+b){
  case 1:
    console.log(1);
    break;
    case 2:
      console.log(1);
      break;
}
`;

eval(code);

JsConfuser.obfuscate(code, {
  target: "node",
  controlFlowFlattening: true,
  compact: false,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
