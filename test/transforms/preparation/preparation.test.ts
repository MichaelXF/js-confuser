import JsConfuser from "../../../src/index";

it("should force blocks to be block statements", async () => {
  var output = await JsConfuser.obfuscate(
    `
  if ( a ) b()
  `,
    {
      target: "node",
      objectExtraction: true, // <- something needs to enabled
    }
  );

  expect(output).toContain("{b()}");
});

it("should force explicit member expressions", async () => {
  var output = await JsConfuser.obfuscate(
    `
  console.log('...')
  `,
    {
      target: "node",
      objectExtraction: true, // <- something needs to enabled
    }
  );

  expect(output).toContain("console['log']");
});
