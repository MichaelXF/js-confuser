require("@babel/register")({
  presets: [
    ["@babel/preset-env", { targets: { esmodules: true } }],
    "@babel/preset-typescript",
  ],
  extensions: [".js", ".jsx", ".ts", ".tsx"],
});

module.exports = require("./test.ts");
