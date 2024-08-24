require("@babel/register")({
  extensions: [".ts", ".tsx", ".js", ".jsx"],
});

// Now run the main TypeScript file
require("./dev.ts");
