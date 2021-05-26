import { readFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var CASH_JS = readFileSync(join(__dirname, "./Cash.src"), "utf-8");

it("works with Cash.js on High Preset", async () => {
  var code = await JsConfuser(CASH_JS, { target: "browser", preset: "high" });

  // Make the required document variables for initialization
  var document = {
    documentElement: {},
    createElement: () => {
      return { style: {} };
    },
  } as any as Document;
  var window = { document } as Window;

  eval(code);

  expect(window).toHaveProperty("cash");
});
