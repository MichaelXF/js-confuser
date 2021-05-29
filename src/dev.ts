import JsConfuser from "./index";

JsConfuser.obfuscate(
  `

function add3(x, y, z){
  function validate(n){
    if ( isNaN(n ) ) {
      throw new Error("Bad number")
    }
  }

  validate(x);
  validate(y);
  validate(z);


  var sum = x+y+z;
  return sum;
}

console.log(add3(20, 10 ,5))

`,
  {
    target: "node",
    verbose: true,
    stack: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
