import JsConfuser from "../../../src/index";

// TODO
test.skip("Variant #1: Extract class methods", async () => {
  var code = `
  function nested() {
    if (true) {
      switch (true) {
        case true:
          let dimension2D = "2D";
  
          class Square {
            constructor(size) {
              this.size = size;
            }
  
            static fromJSON(json) {
              return new Square(json.size);
            }
  
            getArea() {
              return this.size * this.size;
            }
  
            get dimensions() {
              return dimension2D;
            }
  
            set dimensions(value) {
              if (value !== "2D") {
                throw new Error("Only supports 2D");
              }
            }
          }
  
          class Rectangle extends Square {
            constructor(width, length) {
              super(null);
              this.width = width;
              this.length = length;
            }
  
            static fromJSON(json) {
              return new Rectangle(json.width, json.height);
            }
  
            getArea() {
              return this.width * this.length;
            }
  
            myMethod(dim = super.dimensions) {
              console.log(dim);
            }
          }
  
          var rectangle = Rectangle.fromJSON({ width: 10, height: 5 });
  
          console.log(rectangle.getArea());
          rectangle.myMethod();
  
          rectangle.dimensions = "2D"; // Allowed
  
          try {
            rectangle.dimensions = "3D"; // Not allowed
          } catch (e) {
            if (e.message.includes("Only supports 2D")) {
              // console.log("Failed to set dimensions");
              TEST_OUTPUT = true;
            }
          }

      }
    }
  }
  
  nested();
  
  `;

  var output = await JsConfuser(code, { target: "node" });

  var TEST_OUTPUT;
  eval(output);

  expect(TEST_OUTPUT).toStrictEqual(true);
});
