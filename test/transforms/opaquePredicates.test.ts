import JsConfuser from "../../src/index";

it("should append logical expressions", async () => {
  var code = `

    var test = false;
    if ( test ) {

    }
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    opaquePredicates: true,
  });

  expect(output).not.toContain("(test)");
});

// https://github.com/MichaelXF/js-confuser/issues/45
it("should work on default Switch cases", async ()=>{
    var code = `

    switch (0) {
        default:
             input(true);
    }
  `;

  var output = await JsConfuser(code, {
    target: "browser",
    opaquePredicates: true,
  });

  var value;
  function input(valueIn){
    value = valueIn;
  }

  eval(output);

  expect(value).toStrictEqual(true);
})
