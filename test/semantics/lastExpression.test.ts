import JsConfuser from "../../src";

test("Variant #1: Last expression is preserved on 'High' preset", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
  var a = 1;
  var b = 2;
  var c = 3;
  a + b + c;
  `,
    {
      target: "node",
      preset: "high",
    }
  );

  var lastExpression = eval(code);

  expect(lastExpression).toStrictEqual(6);
});

test("Variant #2: Last expression is preserved on 'High' preset with RGF", async () => {
  var { code } = await JsConfuser.obfuscate(
    `
  var a = 1;
  var b = 2;
  var c = 3;
  function compute(){
    return a + b + c;
  }
  compute();
  `,
    {
      target: "node",
      preset: "high",
      rgf: true,
    }
  );

  var lastExpression = eval(code);

  expect(lastExpression).toStrictEqual(6);
});
