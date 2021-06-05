import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

function input(x) {
  console.log(x);
}

(async () => {
  for (var i = 0; i < 2000; i++) {
    var output = await JsConfuser.obfuscate(
      `
      function fibonacci(num)
    {   
        if(num==1)
            return 0;
        if (num == 2)
            return 1;
        return fibonacci(num - 1) + fibonacci(num - 2);
    }
    
      for ( var i = 1; i < 25; i++ ) {
        console.log(i, fibonacci(i))
      }
      
    `,
      {
        target: "node",
        preset: "high",
        stringEncoding: false,
      }
    );

    console.log(i + 1, "/", 2000);
    try {
      process.exit = () => {
        throw new Error("(process.exit was called)");
      };

      console.log(output);
      eval(output);
    } catch (e) {
      console.log(output);
      console.error(e);

      writeFileSync("./dev.error.js", output, { encoding: "utf-8" });

      break;
    }
  }
})();
