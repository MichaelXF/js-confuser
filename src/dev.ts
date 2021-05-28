import JsConfuser from "./index";

JsConfuser.obfuscate(
  `

  console.log("Hello World", "String two", "String three", "String four")


`,
  {
    target: "browser",
    compact: false,
    shuffle: "hash",
    renameVariables: true,
    minify: true,
    stringConcealing: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
