import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";
// const file = readFileSync("./test/code/Cash.src", "utf-8");

(async () => {
  for (var i = 0; i < 2000; i++) {
    var output = await JsConfuser.obfuscate(
      `
      let myVariable = 1;
      
      console.log(myVariable)
      
      // Variant #2 Destructing variable from object (ObjectPattern)
      let { key } = { key: 2 };
      
      console.log(key);
      
      // Variant #3 Destructing variable and using differing output name (ObjectPattern)
      let { key: customName } = { key: 3 };
      
      console.log(customName);
      
      // Variant #4 Destructing variable from array (ArrayPattern)
      let [element] = [4];
      
      console.log(element);
      
      // Variant #5 Destructing computed property from nested pattern
      let [{ ["key"]: deeplyNestedKey }] = [{ key: 5 }];
      
      console.log(deeplyNestedKey);
      
      // Variant #6 Make sure arrow functions work
      const arrowFn = () => 6;
      
      console.log(arrowFn());
      
      // Variant #7 Make sure inline methods on object work
      let es6Object = {
        method() {
          return 7;
        },
      };
      
      console.log(es6Object.method(), "above ^^^");
      
      // Variant #8 Make sure getters on object work
      es6Object = {
        get getter() {
          return 8;
        },
      };
      
      console.log(es6Object.getter);
      
      // Variant #9 Make sure getters with computed properties work
      let customKey = "myGetter";
      es6Object = {
        get [customKey]() {
          return 9;
        },
      };
      
      console.log(es6Object.myGetter);
      
    `,
      {
        target: "node",
        globalConcealing: true,
        stringCompression: true,
        stringEncoding: false,
        duplicateLiteralsRemoval: true,
        shuffle: "hash",
        renameVariables: true,
        movedDeclarations: true,
        minify: true,
        stack: true,
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
