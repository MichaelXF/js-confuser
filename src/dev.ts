import JsConfuser from "./index";

JsConfuser.obfuscate(
  `


console.log("console")
  

`,
  {
    target: "node",
    stringEncoding: true,
    verbose: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
