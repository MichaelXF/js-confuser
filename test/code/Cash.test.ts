import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import JsConfuser from "../../src/index";

var CASH_JS = readFileSync(join(__dirname, "./Cash.src"), "utf-8");

it("works with Cash.js on High Preset", async () => {
  var output = await JsConfuser(CASH_JS, { target: "node", preset: "low" });

  // Make the required document variables for initialization
  var document = {
    documentElement: {},
    createElement: () => {
      return { style: {} };
    },
  } as any as Document;
  var window = { document } as Window;

  // writeFileSync(join(__dirname, "Cash.output"), output, { encoding: "utf-8" });

  eval(output);

  expect(global).toHaveProperty("cash");
});
