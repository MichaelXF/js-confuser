import JsConfuser from "../../src/index";

test("Variant #1: Rename labels", async () => {
  var code = `
    TEST_LABEL: while(0){}
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: true,
  });

  expect(output).not.toContain("TEST_LABEL");
});

test("Variant #2: Remove unused labels", async () => {
  var code = `
    TEST_LABEL: while(0){}
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: true,
  });

  expect(output).not.toContain("TEST_LABEL");
  expect(output).not.toContain(":"); // No labels are required here
});

test("Variant #3: Prefer label-less break/continue statements", async () => {
  var code = `
    TEST_OUTPUT = [];

    TEST_LABEL: while(0){
      break TEST_LABEL;

      TEST_OUTPUT.push(-1);
    }

    TEST_LABEL: for(var i = 0; i < 10; i++){
      if(typeof i === "number") {
        if(i === 0) TEST_LABEL_2: {
          continue TEST_LABEL;
        }
      }
      if(i === 6){
        continue TEST_LABEL;
      }
      if(i === 7) {
        break TEST_LABEL;
      }

      TEST_OUTPUT.push(i);
    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: true,
    identifierGenerator: () => {
      throw new Error("Shouldn't be invoked");
    },
  });

  expect(output).not.toContain("TEST_LABEL");
  expect(output).not.toContain("TEST_LABEL_2");
  expect(output).toContain("break");

  var TEST_OUTPUT;
  eval(output);
  expect(TEST_OUTPUT).toStrictEqual([1, 2, 3, 4, 5]);
});

test("Variant #4: Rename nested labels", async () => {
  var code = `
    TEST_LABEL: for ( var i =0; i < 10; i++ ) {
      switch(1){
        case 1:
          break TEST_LABEL;
      }
    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: true,
  });

  expect(output).not.toContain("TEST_LABEL");
  expect(output).toContain(":for");
});

test("Variant #5: Don't remove labels on block statements", async () => {
  var code = `
    TEST_LABEL: {
      break TEST_LABEL;
    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: true,
  });

  expect(output).not.toContain("TEST_LABEL");
  expect(output).toContain(":{");
});

test("Variant #6: Remove labels on block statements when the label was never used", async () => {
  var code = `
    TEST_LABEL: {
      "";
    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: true,
  });

  expect(output).not.toContain("TEST_LABEL");
  expect(output).not.toContain(":{");
  expect(output).toContain("{");
});

test("Variant #7: Complex label renaming", async () => {
  var sourceCode = `
TEST_OUTPUT = [];

outer_for: for (var i = 0; i < 4; i++) {
  if (i == 3) TEST_OUTPUT.push(-1);
  TEST_OUTPUT.push(i * 3);

  for_label: for (var j = 1; j < 10; j++) {
    if (j == 5) {
      switch_label: switch (true) {
        case true:
          if (i == 2) {
            TEST_OUTPUT.push(9);
            break outer_for;
          } else {
            break for_label;
          }
        case false:
          break switch_label;
        default:
          break switch_label;
      }
    }
    if (j == 4) continue for_label;
    if (j == 3) continue;
    TEST_OUTPUT.push(j + i + i * 2);
  }
}

block_label: {
  TEST_OUTPUT.push(10);
  break block_label;
  TEST_OUTPUT.push(-1);
}

while (true) {
  if (true) {
    break;
  }

  TEST_OUTPUT.push(-1);
}
  `;

  var { code } = await JsConfuser.obfuscate(sourceCode, {
    target: "node",
    renameLabels: true,
  });

  expect(code).not.toContain("outer_for");
  expect(code).not.toContain("for_label");
  expect(code).not.toContain("switch_label");
  expect(code).not.toContain("block_label");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Variant #8: Disable Rename Labels", async () => {
  var code = `
    TEST_LABEL: while(1){
      TEST_OUTPUT = "Correct Value";
      break TEST_LABEL;
      TEST_OUTPUT = "Incorrect Value";
    }
  `;

  var { code: output } = await JsConfuser.obfuscate(code, {
    target: "browser",
    renameLabels: false,
  });

  expect(output).toContain("TEST_LABEL");

  var TEST_OUTPUT;
  eval(code);

  expect(TEST_OUTPUT).toStrictEqual("Correct Value");
});

test("Variant #9: Custom implementation for Rename Labels", async () => {
  var labelsCollected: string[] = [];

  var sourceCode = `
    RENAME_ME: {
        switch(true){
          case true:
            break RENAME_ME;
        }
      }
    KEEP_ME: {
      switch(true){
        case true:
          break KEEP_ME;
      }
    }

  `;

  var { code } = await JsConfuser.obfuscate(sourceCode, {
    target: "browser",
    renameLabels: (label) => {
      labelsCollected.push(label);
      if (label === "KEEP_ME") return false;
      return true;
    },
  });

  expect(code).not.toContain("RENAME_ME");
  expect(code).toContain("KEEP_ME");

  expect(labelsCollected).toStrictEqual(["RENAME_ME", "KEEP_ME"]);
});
