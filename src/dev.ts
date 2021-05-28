import JsConfuser from "./index";

JsConfuser.obfuscate(
  `

  console.log([1,2,3,4,5,6,7,8,9,10,11,12,13])


`,
  {
    target: "browser",
    compact: false,
    shuffle: "hash",
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
