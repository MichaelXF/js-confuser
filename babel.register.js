require("@babel/register")({
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  // Automatically merges babel.config.js for us
});

// Now run the main TypeScript file
require("./dev.ts");
