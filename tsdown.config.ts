module.exports = require("tsdown").defineConfig({
  format: ["cjs"],
  outExtensions: () => ({ js: ".js" }),
  outputOptions: {
    exports: "named",
  },
});
