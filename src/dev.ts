import JsConfuser from "./index";

JsConfuser.obfuscate("console.log(1)", {
  target: "browser",
  lock: {
    integrity: true,
  },
  renameVariables: true,
  identifierGenerator: "randomized",
}).then((obfuscated) => {
  console.log(obfuscated);
});
