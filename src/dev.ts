import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

(async () => {
  for (var i = 0; i < 2000; i++) {
    var output = await JsConfuser.obfuscate(
      `
      function run(){
    
        var result = 1 + 1;
        console.log("1 + 1 is " + result);
        console.log("The source code is only three lines long!");
      }
    
      run()
      
    `,
      {
        target: "node",
        preset: "high",
      }
    );

    console.log(i + 1, "/", 2000);
    try {
      process.exit = () => {
        throw new Error("(process.exit was called)");
      };
      eval(output);
    } catch (e) {
      console.log(output);
      console.error(e);

      writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

      break;
    }
  }
})();
