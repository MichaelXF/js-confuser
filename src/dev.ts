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
      function getNumbers(){
        return [5, 10];
      }
      
      function multiply(x,y){
        return x*y;
      }
      
      function testFunction(){
        function add(x,y){
          return x+y;
        }
      
        function testInnerFunction(){
          var numbers = getNumbers();
      
          // 5*10 + 10 = 60
          return add(multiply(numbers[0], numbers[1]), numbers[1])
        }
      
        input( testInnerFunction() );
      }
      
      testFunction();
      
    `,
      {
        target: "node",
        rgf: "all",
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
