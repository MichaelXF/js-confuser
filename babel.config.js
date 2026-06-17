module.exports = {
  presets: ["@babel/preset-env", "@babel/preset-typescript"],
  env: {
    build: {
      plugins: [["replace-import-extension", { extMapping: { ".ts": ".js" } }]],
    },
  },
};
