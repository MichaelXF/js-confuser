import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

var code = `

var arrow = (...b)=>{
	console.log(b)
}
`;

JsConfuser.obfuscate(code, {
  target: "node",
  es5: true,
}).then((output) => {
  console.log(output);
  writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

  eval(output);
});
