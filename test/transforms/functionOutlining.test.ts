import JsConfuser from "../../src/index";

test("Variant #1: Outline expressions", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var ten = Math.floor(5 * Number(2))
    TEST_OUTPUT = ten;
    `,
    {
      target: "node",
      functionOutlining: true,
    }
  );

  expect(code).not.toContain("ten=Math.floor");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #2: Don't outline expressions with 'eval' 'this' or 'arguments'", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function testFunction(){
      var expectedThis = {};

      function shouldNotOutline(){
        var ten = eval("10");
        if(this === expectedThis){ 
           return ten + arguments[0];
        }
      }

      var result = shouldNotOutline.call(expectedThis, 15);
      return result;
    }

    TEST_OUTPUT = testFunction(); // 25
    `,
    {
      target: "node",
      functionOutlining: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(25);
});

test("Variant #2: Outline expressions in nested functions", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
var outsideVar = 10;
function testFunction() {
  function innerFunction1(){
    var innerFunction2 = function(){
     var ten = Math.floor(5 * Number(2));
      var five = Math.floor(Number(5));
      return ten + five + outsideVar;
    }
    return innerFunction2();
  }
  return innerFunction1();
}

var testResult = testFunction();
TEST_OUTPUT = testResult; // 25
`,
    {
      target: "node",
      functionOutlining: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(25);
});

test("Variant #4: Handle typeof expressions", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    var existentialVariable = 10;
    var values = [
      typeof nonexistentVariable1,
      typeof nonexistentVariable2,
      typeof nonexistentVariable3,
      typeof nonexistentVariable4,
      typeof nonexistentVariable5,
      typeof nonexistentVariable6,
      typeof nonexistentVariable7,
      typeof nonexistentVariable8,
      typeof nonexistentVariable9,
      typeof nonexistentVariable10,
    ];

    TEST_OUTPUT = true;

    for(var value of values){
      if(typeof value !== "string" || value !== "undefined") {
        TEST_OUTPUT = false;
        break;
      }
    }

    if(typeof existentialVariable !== "number"){
      TEST_OUTPUT = false;
    }
    `,
    {
      target: "node",
      functionOutlining: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual(true);
});

test("Variant #5: Handle direct invocations", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
    function getThis(){
      return this;
    }

    var obj1 = {
      getThis: getThis
    }
    var obj2 = {
      getThis: getThis
    }
    var obj3 = {
      getThis: getThis
    }
    
    TEST_OUTPUT = [
      getThis() === undefined,
      obj1.getThis() === obj1,
      obj2.getThis() === obj2,
      obj3.getThis() === obj3,
    ]
    `,
    {
      target: "node",
      functionOutlining: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual([true, true, true, true]);
});
