import JsConfuser from "./index";

const fs = require("fs");
const input = fs.readFileSync("example.js", "utf-8");

JsConfuser(input, {
  target: "node",
  preset: "low",
  compact: false,
  indent: 2,
}).then((output) => {
  fs.writeFileSync("example.output.js", output);

  require("./example.output.js");
});
