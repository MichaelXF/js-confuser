import { ok } from "assert";
import { ObfuscateOptions } from "../options";
import { alphabeticalGenerator, createZeroWidthGenerator } from "./gen-utils";
import { choice, getRandomHexString, getRandomInteger } from "./random-utils";
import { computeProbabilityMap } from "../probability";

export class NameGen {
  private generatedNames = new Set<string>();
  private counter = 1;
  private zeroWidthGenerator = createZeroWidthGenerator();

  constructor(
    private identifierGenerator: ObfuscateOptions["identifierGenerator"] = "randomized"
  ) {}

  private attemptGenerate() {
    if (typeof this.identifierGenerator === "function") {
      var value = this.identifierGenerator();
      ok(
        typeof value === "string",
        "Custom identifier generator must return a string"
      );
      return value;
    }

    var mode = computeProbabilityMap(this.identifierGenerator);

    const randomizedLength = getRandomInteger(6, 8);

    switch (mode) {
      case "randomized":
        var characters =
          "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
        var numbers = "0123456789".split("");

        var combined = [...characters, ...numbers];

        var result = "";
        for (var i = 0; i < randomizedLength; i++) {
          result += choice(i == 0 ? characters : combined);
        }
        return result;

      case "hexadecimal":
        return "_0x" + getRandomHexString(randomizedLength);

      case "mangled":
        return alphabeticalGenerator(this.counter++);

      case "number":
        return "var_" + this.counter++;

      case "zeroWidth":
        return this.zeroWidthGenerator.generate();

      default:
        throw new Error(
          "Invalid identifier generator mode: " + this.identifierGenerator
        );
    }
  }

  generate(): string {
    let name: string;

    do {
      name = this.attemptGenerate();
    } while (this.generatedNames.has(name));

    this.generatedNames.add(name);
    return name;
  }
}
