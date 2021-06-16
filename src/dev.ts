import { readFileSync, writeFileSync } from "fs";
import JsConfuser from "./index";

// Windows user-agent
var window = {
  navigator: {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246",
  },
};

JsConfuser.obfuscate(
  `
function caught(){
  TEST_VARIABLE = "caught";
}`,
  {
    target: "browser",
    lock: {
      osLock: ["ios"],
      countermeasures: "caught",
    },
  }
).then((output) => {
  var TEST_VARIABLE;

  console.log(output);
});
