import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import path from "path";
import os from "os";
import JsConfuser from "../src/index.ts";
import { ObfuscationResult } from "../src/obfuscationResult.ts";

async function evalWithSourceMap(
  code: string,
  map: ObfuscationResult["map"],
): Promise<string> {
  const dir = os.tmpdir();
  const id = `jsc_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const outFile = `${id}.js`;
  const mapFile = `${id}.js.map`;

  const outFullPath = path.join(dir, outFile);
  const mapFullPath = path.join(dir, mapFile);

  // Replace the source name with our randomly generated name
  map.sources[0] = outFile;

  // Node.js does not support full Windows path, it must be a relative path
  writeFileSync(outFullPath, code + `\n//# sourceMappingURL=${mapFile}`);
  writeFileSync(mapFullPath, JSON.stringify(map));

  try {
    // Code should print its own stack; capture stdout
    return execSync(`node --enable-source-maps "${outFullPath}"`, {
      encoding: "utf-8",
    });
  } finally {
    try {
      unlinkSync(outFullPath);
      unlinkSync(mapFullPath);
    } catch (err) {}
  }
}

test("Variant #1: Source Map and Source Map Name", async () => {
  var { code, map } = await JsConfuser.obfuscate(
    `
    console.log("Hello World!");
    `,
    {
      target: "node",
      sourceMap: {
        fileName: "example.js",
      },
    },
  );

  expect(typeof map).toStrictEqual("object");
  [
    "version",
    "names",
    "sources",
    "sourcesContent",
    "mappings",
    "ignoreList",
  ].forEach((key) => expect(Object.keys(map)).toContain(key));

  expect(map.sources).toContain("example.js");
});

test("Variant #2: Source Maps on Rename Variables", async () => {
  var { code, map } = await JsConfuser.obfuscate(
    `
    function myNamedFunction(){
      return (new Error()).stack;
    }
    console.log( myNamedFunction() );
    `,
    {
      target: "node",
      sourceMap: true,
      renameVariables: true,
    },
  );

  // Ensure myNamedFunction was renamed and no longer included in the output code
  expect(code).not.toContain("myNamedFunction");

  var stdout = await evalWithSourceMap(code, map);
  // Ensure "myNamedFunction" was correctly resolved
  expect(stdout).toContain("myNamedFunction");
});

test("Variant #3: Source Maps on Control Flow Flattening", async () => {
  var { code, map } = await JsConfuser.obfuscate(
    `
    var _x, _y, _z;

    function cffHere(){
      var _a, _b, _c; // Min 3 statements to apply

      function findThisNamedFunction(){
        this; // Marks this function as 'unsafe'
        return (new Error()).stack;
      }
      console.log( findThisNamedFunction() );
    }

    cffHere();
    `,
    {
      target: "node",
      sourceMap: true,
      renameVariables: true,
      controlFlowFlattening: true,
      identifierGenerator: "mangled",
    },
  );

  // Ensure CFF applied
  expect(code).toContain("while");

  // Ensure findThisNamedFunction was renamed and no longer included in the output code
  expect(code).not.toContain("findThisNamedFunction");

  var stdout = await evalWithSourceMap(code, map);
  // Ensure "findThisNamedFunction" was correctly resolved
  expect(stdout).toContain("findThisNamedFunction");
});

test("Variant #4: Source Maps on Dispatcher", async () => {
  var { code, map } = await JsConfuser.obfuscate(
    `
    function findThisNamedFunction(){
      this;
      return (new Error()).stack;
    }

    function callToFunction(){
      return findThisNamedFunction();
    }

    console.log( callToFunction() );
    `,
    {
      target: "node",
      sourceMap: true,
      renameVariables: true,
      dispatcher: true,
      identifierGenerator: "mangled",
    },
  );

  // Ensure findThisNamedFunction was renamed and no longer included in the output code
  expect(code).not.toContain("findThisNamedFunction");

  var stdout = await evalWithSourceMap(code, map);
  // Ensure "findThisNamedFunction" was correctly resolved
  expect(stdout).toContain("findThisNamedFunction");
});

test("Variant #5: Source Maps on Flatten", async () => {
  var { code, map } = await JsConfuser.obfuscate(
    `
    function getStack() {
      return new Error().stack;
    }

    function findThisNamedFunction() {
      return getStack();
    }

    console.log(findThisNamedFunction());
    `,
    {
      target: "node",
      sourceMap: true,
      renameVariables: true,
      flatten: true,
      identifierGenerator: "mangled",
    },
  );

  // Ensure findThisNamedFunction was renamed and no longer included in the output code
  expect(code).not.toContain("findThisNamedFunction");

  var stdout = await evalWithSourceMap(code, map);
  // Ensure "findThisNamedFunction" was correctly resolved
  expect(stdout).toContain("findThisNamedFunction");
});
