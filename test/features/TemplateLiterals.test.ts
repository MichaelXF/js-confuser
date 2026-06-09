import { obfuscate, evalCode } from "../test-utils";

test("Variant #1: Basic template literal with expressions", async () => {
  const { code } = await obfuscate(`
    let name = "World";
    window.TEST_OUTPUT = \`Hello, \${name}!\`;
  `);

  expect(await evalCode(code)).toEqual("Hello, World!");
});

test("Variant #2: Template literal with multiple expressions", async () => {
  const { code } = await obfuscate(`
    let a = 1, b = 2;
    window.TEST_OUTPUT = \`\${a} + \${b} = \${a + b}\`;
  `);

  expect(await evalCode(code)).toEqual("1 + 2 = 3");
});

test("Variant #3: Template literal with no expressions", async () => {
  const { code } = await obfuscate(`
    window.TEST_OUTPUT = \`just a string\`;
  `);

  expect(await evalCode(code)).toEqual("just a string");
});

test("Variant #4: Nested expressions in template literal", async () => {
  const { code } = await obfuscate(`
    let x = 5;
    window.TEST_OUTPUT = \`value is \${x > 3 ? "big" : "small"}\`;
  `);

  expect(await evalCode(code)).toEqual("value is big");
});
