export class IntGen {
  private min: number;
  private max: number;
  private generatedInts: Set<number>;

  constructor(min: number = -250, max: number = 250) {
    this.min = min;
    this.max = max;
    this.generatedInts = new Set<number>();
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generate(): number {
    let randomInt: number;

    // Keep generating until we find a unique integer
    do {
      randomInt = this.getRandomInt(this.min, this.max);

      // Expand the range if most integers in the current range are exhausted
      if (this.generatedInts.size >= 0.8 * (this.max - this.min)) {
        this.min -= 100;
        this.max += 100;
      }
    } while (this.generatedInts.has(randomInt));

    this.generatedInts.add(randomInt);
    return randomInt;
  }
}
