import { shuffle } from "./random-utils";

export function alphabeticalGenerator(index: number) {
  let name = "";
  while (index > 0) {
    var t = (index - 1) % 52;
    var thisChar =
      t >= 26 ? String.fromCharCode(65 + t - 26) : String.fromCharCode(97 + t);
    name = thisChar + name;
    index = ((index - t) / 52) | 0;
  }
  if (!name) {
    name = "_";
  }
  return name;
}

export function createZeroWidthGenerator() {
  var keywords = [
    "if",
    "in",
    "for",
    "let",
    "new",
    "try",
    "var",
    "case",
    "else",
    "null",
    "break",
    "catch",
    "class",
    "const",
    "super",
    "throw",
    "while",
    "yield",
    "delete",
    "export",
    "import",
    "public",
    "return",
    "switch",
    "default",
    "finally",
    "private",
    "continue",
    "debugger",
    "function",
    "arguments",
    "protected",
    "instanceof",
    "await",
    "async",

    // new key words and other fun stuff :P
    "NaN",
    "undefined",
    "true",
    "false",
    "typeof",
    "this",
    "static",
    "void",
    "of",
  ];

  var maxSize = 0;
  var currentKeyWordsArray: string[] = [];

  function generateArray() {
    var result = keywords
      .map(
        (keyWord) =>
          keyWord + "\u200C".repeat(Math.max(maxSize - keyWord.length, 1))
      )
      .filter((craftedVariableName) => craftedVariableName.length == maxSize);

    if (!result.length) {
      ++maxSize;
      return generateArray();
    }

    return shuffle(result);
  }

  function getNextVariable(): string {
    if (!currentKeyWordsArray.length) {
      ++maxSize;
      currentKeyWordsArray = generateArray();
    }
    return currentKeyWordsArray.pop();
  }

  return { generate: getNextVariable };
}
