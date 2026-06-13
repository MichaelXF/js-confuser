const transform = require("ts-jest").createDefaultPreset().transform;

const options = [
  "minify",
  "renameVariables",
  "renameLabels",
  "controlFlowFlattening",
  "globalConcealing",
  "stringConcealing",
  "stringSplitting",
  "duplicateLiteralsRemoval",
  "dispatcher",
  "rgf",
  "objectExtraction",
  "flatten",
  "deadCode",
  "calculator",
  "movedDeclarations",
  "opaquePredicates",
  "variableMasking",
  "preserveFunctionLength",
  "astScrambler",
  "pack",
]; // This is only considering options which aren't already 100% in High preset

const OPTIONS_MATRIX = [
  ...options.map((option) => ({
    displayName: option,
    OPTIONS: {
      [option]: true,
    },
  })),

  {
    displayName: "preset-high",
    OPTIONS: {
      preset: "high",
    },
  },
];

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Main suite: all tests except the test/features folder
    {
      displayName: "main",
      transform,
      testPathIgnorePatterns: [
        "<rootDir>/node_modules/",
        "<rootDir>/test/features/",
      ],
    },

    // Feature suites: one project per OPTIONS_MATRIX entry
    ...OPTIONS_MATRIX.map(({ displayName, OPTIONS }) => ({
      displayName: `features:${displayName}`,
      transform,
      testMatch: ["<rootDir>/test/features/**/*.test.ts?(x)"],
      globals: { OPTIONS },
    })),
  ],
};
