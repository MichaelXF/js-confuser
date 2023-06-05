import JsConfuser from "../../src/index";

test("Variant #1: Force Block Statements on If statements", async () => {
  var output = await JsConfuser.obfuscate(
    `
  if ( a ) b();

  if ( a ) {} else c()
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure parenthesis were added
  expect(output).toContain("{b()}");
  expect(output).toContain("{c()}");
});

test("Variant #2: Force Block Statements on Arrow functions", async () => {
  var output = await JsConfuser.obfuscate(
    `
  TEST_OUTPUT = ()=>true;
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure parenthesis were added
  expect(output).toContain("return");
  expect(output).toContain("{");
  expect(output).toContain("}");

  // Ensure code still works
  var TEST_OUTPUT;
  eval(output);

  expect(typeof TEST_OUTPUT).toStrictEqual("function");
  expect(TEST_OUTPUT()).toStrictEqual(true);
});

test("Variant #3: Force Block Statements on For loops", async () => {
  var output = await JsConfuser.obfuscate(
    `
  for(;;) forStatement();
  for(a in b) forInStatement();
  for(a of b) forOfStatement();
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure parenthesis were added
  expect(output).toContain("{forStatement()}");
  expect(output).toContain("{forInStatement()}");
  expect(output).toContain("{forOfStatement()}");
});

test("Variant #4: Force Block Statements on While loops/With statement", async () => {
  var output = await JsConfuser.obfuscate(
    `
  while(1) whileStatement();
  with(a) withStatement();
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure parenthesis were added
  expect(output).toContain("{whileStatement()}");
  expect(output).toContain("{withStatement()}");
});

test("Variant #5: Force object accessors to use strings instead", async () => {
  var output = await JsConfuser.obfuscate(
    `
  console.log("Hello World")
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure the member expression got changed to a string
  expect(output).toContain("console['log']");
});

test("Variant #6: Force object property keys to use strings instead", async () => {
  var output = await JsConfuser.obfuscate(
    `
  var myObject = {
    myKey: 1
  }
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure key got changed to a string
  expect(output).toContain("'myKey'");
});

test("Variant #7: Force Variable declarations to be expanded", async () => {
  var output = await JsConfuser.obfuscate(
    `
  var myVar1, myVar2, myVar3;

  switch(true){
    case true:
      var mySwitchVar1, mySwitchVar2, mySwitchVar3;
    break;
  }

  {
    var myBlockVar1;
    var myBlockVar2;
    var myBlockVar3;
  }

  if(true) var myIfVar1, myIfVar2, myIfVar3;
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure the variable declarations got changed
  expect(output).toContain("var myVar1;");
  expect(output).toContain("var myVar2;");
  expect(output).toContain("var myVar3;");

  // Ensure the switch declarations got changed
  expect(output).toContain("var mySwitchVar1;");
  expect(output).toContain("var mySwitchVar2;");
  expect(output).toContain("var mySwitchVar3;");

  // Ensure the block declarations got changed
  expect(output).toContain("var myBlockVar1;");
  expect(output).toContain("var myBlockVar2;");
  expect(output).toContain("var myBlockVar3");

  // Ensure the if-statement declarations got changed
  expect(output).toContain("var myIfVar1;");
  expect(output).toContain("var myIfVar2;");
  expect(output).toContain("var myIfVar3");
});
