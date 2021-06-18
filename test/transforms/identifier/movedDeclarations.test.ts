import JsConfuser from "../../../src/index";

it("should move variable declarations to the top of the lexical block", async () => {
  var output = await JsConfuser.obfuscate(
    `
    console.log("...")
    var a = 1, b = 2;
    console.log(a)
    `,
    {
      target: "node",
      movedDeclarations: true,
    }
  );

  expect(output).toContain("var a,b;");
  expect(output).toContain("a=1,b=2");
});

it("should still execute properly", async () => {
  var output = await JsConfuser.obfuscate(
    `

    function add(n1, n2){
      return n1 + n2;
    }

    var a = 6, b = 4;

    input( add(a, b) );
    `,
    {
      target: "node",
      movedDeclarations: true,
    }
  );

  expect(output).toContain("var a,b;");

  var value = "never_called";
  function input(valueIn) {
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual(10);
});

it("should not move declarations in for statements", async () => {
  var output = await JsConfuser.obfuscate(
    `
    for ( var i = 0; i < 10; i++ ) {
      
    }
    `,
    {
      target: "node",
      movedDeclarations: true,
    }
  );

  expect(output).toContain("for(var i=0;");
});

it("should not move redefined names", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var a;
    var output;
    (function(){
      var a;
      var output;
    })();
    `,
    {
      target: "node",
      movedDeclarations: true,
    }
  );

  expect(output).toContain("var a;var output;");
});

it("should not move declarations in switch cases", async () => {
  var output = await JsConfuser.obfuscate(
    `
    var b = 0;
    switch(b){
      case 0:
        var a = 0;
        break;
      case 1:
        a = 1;
        break;
    }
    `,
    {
      target: "node",
      movedDeclarations: true,
    }
  );

  expect(output).toContain("var a=0;");
});
