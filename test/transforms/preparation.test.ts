import JsConfuser from "../../src/index";

test("Variant #1: Force Block Statements on If statements", async () => {
  var { code: output } = await JsConfuser.obfuscate(
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
  var { code: output } = await JsConfuser.obfuscate(
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
  var { code: output } = await JsConfuser.obfuscate(
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
  var { code: output } = await JsConfuser.obfuscate(
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
  expect(output).toContain("withStatement()");
});

test("Variant #5: Force object accessors to use strings instead", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  console.log("Hello World")
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure the member expression got changed to a string
  expect(output).toContain('console["log"]');
});

test("Variant #6: Force object property keys to use strings instead", async () => {
  var { code: output } = await JsConfuser.obfuscate(
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
  expect(output).toContain('"myKey"');
});

test("Variant #7: Force Variable declarations to be expanded", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
  var myVar1, myVar2, myVar3;

  switch(true){
    case true:
      var mySwitchVar1, mySwitchVar2, mySwitchVar3;
    break;
  }

  {
    var myBlockVar1,
     myBlockVar2,
     myBlockVar3;
  }

  if(true) var myIfVar1, myIfVar2, myIfVar3;

  function myFunction(){
    var myFunctionVar1, myFunctionVar2, myFunctionVar3;
  }

  for(var myForVar1, myForVar2, myForVar3; ; ){
    break;
  }

  export var myExportVar1, myExportVar2, myExportVar3;
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

  // Ensure the for-loop declarations got changed
  expect(output).toContain("var myForVar1;");
  expect(output).toContain("var myForVar2;");
  expect(output).toContain("var myForVar3;");

  // Ensure the export declarations got changed
  expect(output).toContain("export var myExportVar1;");
  expect(output).toContain("export var myExportVar2;");
  expect(output).toContain("export var myExportVar3;");
});

test("Variant #8: Convert Regex Literals to `new RegExp()` constructor calls", async () => {
  var { code: output } = await JsConfuser.obfuscate(
    `
    const numberRegex = /-?(?:\\d+\\.\\d+|\\.\\d+|\\d+)(?=\\b)/g;

    const testString = \`
      This is a test -123 with numbers 456, 78.9, and .23, -0.45, -98.76, and 0.5.
      Invalid numbers include -. and text like abc.
    \`;

    var numbers = testString.match(numberRegex)

    TEST_OUTPUT = numbers;
  `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure the regex literal got changed
  expect(output).toContain("new RegExp");
  expect(output).not.toContain("/g");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual([
    "-123",
    "456",
    "78.9",
    ".23",
    "-0.45",
    "-98.76",
    "0.5",
  ]);
});

test("Variant #9: Convert Template Literals into equivalent String Literal", async () => {
  const { code } = await JsConfuser.obfuscate(
    `
    var firstName = \`John\`;
    var lastName = \`Doe\`;

    var fullName = \`\${firstName} \${lastName}\`;
    TEST_OUTPUT = \`Hello \${fullName}!\`;
    `,
    {
      target: "node",
      compact: true, // <- Something needs to be enabled
    }
  );

  // Ensure the template literals got changed
  expect(code).not.toContain("`");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Hello John Doe!");
});

test("Variant #10: Preserve Tagged Template Literal", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
  // Define a tag function for syntax highlighting
  function highlight(strings, ...values) {
    return strings.reduce((result, string, i) => {
      // Wrap the interpolated values in a styled span
      const value = values[i] ? \`**\${values[i]}**\` : '';
      return result + string + value;
    }, '');
  }

  TEST_OUTPUT = highlight\`Hello, \${ "Internet User" }!\`;
  `,
    {
      target: "node",
      compact: true,
    }
  );

  var TEST_OUTPUT;
  eval(code);

  // Ensure the tagged template literal properly executed
  expect(TEST_OUTPUT).toContain("Hello, **Internet User**!");
});
