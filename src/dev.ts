import JsConfuser from "./index";

JsConfuser.obfuscate(
  `

  var c = 0;
  function x(){
    return 1;
  }
function log(){
  console.log(add(1,1))
}
function add(x,y){
  c = 1;
  return x+y;
}

log();

console.log(c)
  

`,
  {
    target: "node",
    dispatcher: true,
    rgf: true,
    flatten: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
