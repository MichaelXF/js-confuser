import { ok } from "assert";
import { ObfuscateOptions } from "../options";
import { alphabeticalGenerator, createZeroWidthGenerator } from "./gen-utils";
import {
  choice,
  getRandomChineseString,
  getRandomHexString,
  getRandomInteger,
} from "./random-utils";
import { reservedKeywords, reservedObjectPrototype } from "../constants";
import Obfuscator from "../obfuscator";

/**
 * Generate random names for variables and properties.
 */
export class NameGen {
  public generatedNames = new Set<string>();
  public notSafeForReuseNames = new Set<string>();

  private counter = 1;
  private zeroWidthGenerator = createZeroWidthGenerator();

  constructor(
    private identifierGenerator: ObfuscateOptions["identifierGenerator"] = "randomized",
    public options = {
      avoidReserved: false,
      avoidObjectPrototype: false,
    }
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

    var mode = Obfuscator.prototype.computeProbabilityMap(
      this.identifierGenerator
    );

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
        var mangledName = "";
        do {
          mangledName = alphabeticalGenerator(this.counter++);
        } while (reservedKeywords.includes(mangledName));

        return mangledName;

      case "number":
        return "var_" + this.counter++;

      case "zeroWidth":
        return this.zeroWidthGenerator.generate();

      case "chinese":
        return getRandomChineseString(randomizedLength);

      default:
        throw new Error(
          "Invalid identifier generator mode: " + this.identifierGenerator
        );
    }
  }

  generate(isSafeForReuse = true): string {
    let name: string;

    do {
      name = this.attemptGenerate();

      // Avoid reserved keywords
      if (this.options.avoidReserved && reservedKeywords.includes(name)) {
        name = "";
        continue;
      }

      // Avoid reserved object prototype properties
      if (
        this.options.avoidObjectPrototype &&
        reservedObjectPrototype.has(name)
      ) {
        name = "";
        continue;
      }
    } while (!name || this.generatedNames.has(name));

    this.generatedNames.add(name);
    if (!isSafeForReuse) {
      this.notSafeForReuseNames.add(name);
    }
    return name;
  }
}
