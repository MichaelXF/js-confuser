import JsConfuser from "./index";

JsConfuser.obfuscate(
  `

  function add3(x, y, z){
    return x + y + z;
  }
  

console.log(add3(20, 10 ,5))

`,
  {
    target: "node",
    verbose: true,
    stack: true,
    renameVariables: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
