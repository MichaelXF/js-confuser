import { criticalFunctionTag } from "../../../src/constants";
import JsConfuser from "../../../src/index";

// Enable Control Flow Flattening's 'Expression Obfuscation' but skips all CFF switch transformations
function fakeEnabled() {
  return false;
}

test("Variant #1: Join expressions in a sequence expression", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT=0;
  TEST_OUTPUT++;
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT=0,TEST_OUTPUT++");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

test("Variant #2: If Statement", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT=0;
  if(true){
    TEST_OUTPUT++;
  }
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT=0,true");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(1);
});

test("Variant #3: ForStatement (Variable Declaration initializer)", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT=0;
  for(var i =0; i < 10; i++){
    TEST_OUTPUT++;
  }
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT=0,0");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #4: ForStatement (Assignment expression initializer)", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT=0;
  for(i = 0; i < 10; i++){
    TEST_OUTPUT++;
  }
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT=0,0");

  var TEST_OUTPUT, i;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #5: Return statement", async () => {
  var output = await JsConfuser(
    `
  function fn(){
    TEST_OUTPUT = 10;
    return "Value";
  }
  fn();
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT=10,'Value'");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #6: Return statement (no argument)", async () => {
  var output = await JsConfuser(
    `
  function fn(){
    TEST_OUTPUT = 10;
    return;
  }
  fn();
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT=10,undefined");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(10);
});

test("Variant #7: Throw statement", async () => {
  var output = await JsConfuser(
    `
  function fn(){
    TEST_OUTPUT = "Correct Value";
    throw new Error("My Error")
  }
  try {
    fn();
  } catch(e){

  }
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("TEST_OUTPUT='Correct Value',new Error");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #8: Variable declaration", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT = "Correct Value";
  var x = 1, y = 2;
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("(TEST_OUTPUT='Correct Value'");

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #9: Variable declaration (no initializer)", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT = "Correct Value";
  var x,y;
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain(`(TEST_OUTPUT='Correct Value',undefined)`);

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #10: Use function call", async () => {
  var output = await JsConfuser(
    `
  TEST_OUTPUT = "Correct Value";
  var x,y;
  `,
    { target: "node", controlFlowFlattening: fakeEnabled }
  );

  expect(output).toContain("function");
  expect(output).toContain(criticalFunctionTag);
});
