import JsConfuser from "./index";

JsConfuser.obfuscate(
  `

function getNumbers(){
  return [5, 10];
}

function multiply(x,y){
  return x*y;
}

function testFunction(){
  function add(x,y){
    return x+y;
  }

  function testInnerFunction(){
    var numbers = getNumbers();

    // 5*10 + 10 = 60
    return add(multiply(numbers[0], numbers[1]), numbers[1])
  }

  testInnerFunction();
}

testFunction();

`,
  {
    target: "node",
    verbose: true,
    rgf: true,
  }
).then((obfuscated) => {
  console.log(obfuscated);

  eval(obfuscated);
});
