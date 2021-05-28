import JsConfuser from "../../src/index";

it("should execute in the correct order (ControlFlowFlattening)", async () => {
  var code = `
    var array = [];

    array.push(1);
    array.push(2);
    array.push(3);
    array.push(4);
    array.push(5);
    array.push(6);
    array.push(7);
    array.push(8);
    array.push(9);
    array.push(10);

    input(array);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  function input(array) {
    expect(array).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }

  eval(output);
});

it("should obfuscate for loops (ControlFlowObfuscation)", async () => {
  var code = `
    var array = [];

    for ( var i = 1; i <= 10; i++ ) {
      array.push(i);
    }

    input(array);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  expect(output).not.toContain("for ( var i");

  function input(array) {
    expect(array).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }

  eval(output);
});

it("should obfuscate numbered switch statements (SwitchCaseObfuscation)", async () => {
  var code = `
    var array = [];

    function runOnce(stateParam){
      switch(stateParam){
        case 1: array.push(1, 2, 3); break;
        case 2: array.push(4, 5, 6); break;
        case 3: array.push(7, 8, 9); break;
        case 4: array.push(10); break;
      }
    }

    runOnce(1);
    runOnce(2);
    runOnce(3);
    runOnce(4);

    input(array);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  expect(output).not.toContain("case 1:");

  function input(array) {
    expect(array).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }

  eval(output);
});

it("should work with break statements", async () => {
  var code = `

    var TEST_ARRAY = [];

    for ( var i =1; i < 50; i++ ) {
      if ( i == 11 ) {
        break;
      }
      TEST_ARRAY.push(i);
    }

    input(TEST_ARRAY);
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    controlFlowFlattening: true,
  });

  expect(output).toContain("switch");
  expect(output).toContain("while");

  function input(array) {
    expect(array).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }

  eval(output);
});

it("should not obfuscate code with `let` (Lexically bound variables, ControlFlowFlattening)", async () => {
  var code = `
  let array = [];

    array.push(1);
    array.push(2);
    array.push(3);
    array.push(4);
    array.push(5);
    array.push(6);
    array.push(7);
    array.push(8);
    array.push(9);
    array.push(10);

    input(array);
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  expect(output).not.toContain("switch");
});

it("should not obfuscate code with `let` (Lexically bound variables, ControlFlowObfuscation)", async () => {
  var code = `
  var array=[];
  for ( let i =1; i <= 10; i++ ) {
    array.push(i);
  }

    input(array);
  `;

  var output = await JsConfuser(code, {
    target: "node",
    controlFlowFlattening: true,
  });

  expect(output).not.toContain("switch");
});
