import { alphabeticalGenerator, getRandomString } from "./random-utils";

export class NameGen {
  private mode: "mangled" | "randomized";
  private generatedNames: Set<string>;
  private mangledIndex: number;

  constructor(mode: "mangled" | "randomized" = "randomized") {
    this.mode = mode;
    this.generatedNames = new Set<string>();
    this.mangledIndex = 0;
  }

  generate(): string {
    let name: string;

    do {
      if (this.mode === "mangled") {
        this.mangledIndex++;
        name = alphabeticalGenerator(this.mangledIndex);
      } else {
        name = getRandomString(6); // Adjust length as needed
      }
    } while (this.generatedNames.has(name));

    this.generatedNames.add(name);
    return name;
  }
}
