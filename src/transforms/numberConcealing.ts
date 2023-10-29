import { ObfuscateOrder } from "../order";
import { ComputeProbabilityMap } from "../probability";
import { ExitCallback } from "../traverse";
import {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  ConditionalExpression,
  Identifier,
  Literal,
  MemberExpression,
  Node,
  ObjectExpression,
  Property,
  SequenceExpression,
  UnaryExpression,
} from "../util/gen";
import {
  chance,
  choice,
  getRandomFalseExpression,
  getRandomIdentifier,
  getRandomTrueExpression,
} from "../util/random";
import Transform from "./transform";

export default class NumberConcealing extends Transform {
  constructor(o) {
    super(o, ObfuscateOrder.NumberConcealing);
  }

  match(object: Node, parents: Node[]): boolean {
    return object.type === "Literal" && typeof object.value === "number";
  }

  transform(object: Node, parents: Node[]): void | ExitCallback {
    if (
      // escodegen has problems with these:
      parents[0].type === "MethodDefinition" ||
      (parents[0].type === "Property" && parents[0].key === object) ||
      !Number.isSafeInteger(Math.floor(object.value)) ||
      !ComputeProbabilityMap(this.options.numberConcealing)
    )
      return;

    var value = calculator(Math.floor(object.value));
    if (Math.floor(object.value) !== object.value)
      value = BinaryExpression(
        "+",
        value,
        Literal(object.value - Math.floor(object.value)),
      );

    if (chance(20))
      // higher chance than in encodeNumber
      value = wrapExpression(value);

    return () => {
      this.replace(object, value);
    };
  }
}

function calculator(value: number): Node {
  const availableOperators = ["+", "-", "*"];
  // these operations don't make sense for large numbers because they require even
  // larger ones, which would come into unsafe number territory for JS numbers
  if (Math.abs(value) < 1e12) {
    availableOperators.push("/");
    if (value >= 0)
      // modulo doesnt work with negative values
      availableOperators.push("%");
  }

  // bitwise operators only work on i32
  if (Math.abs(value) < 0x7fffffff) availableOperators.push("^");

  const operator = choice(availableOperators);
  let values: [number, number];
  let complementary: number;

  switch (operator) {
    case "+":
      complementary = similarValue(value);
      values = [complementary, value - complementary];
      if (chance(50)) values.reverse();
      break;

    case "-":
      complementary = similarValue(value);
      values = [value + complementary, complementary];
      break;

    case "*":
      complementary = 1;
      for (let i = 2; i <= 97; i++) if (value % i === 0) complementary = i;
      values = [complementary, value / complementary];
      if (chance(50)) values.reverse();
      break;

    case "/":
      complementary = Math.floor(Math.random() * 100) + 1;
      values = [value * complementary, complementary];
      break;

    case "^":
      complementary = similarValue(value);
      values = [value ^ complementary, complementary];
      if (chance(50)) values.reverse();
      break;

    case "%":
      complementary = Math.abs(value) + Math.abs(similarValue(value));
      const factor = Math.floor(Math.random() * 100) + 1;
      values = [value + complementary * factor, complementary];
      break;
  }
  // some operations (especially modulo) can introduce inaccuracies on big numbers
  // so if we get any unsafe number, reroll
  if (
    !values.every(Number.isSafeInteger) ||
    (operator === "*" && complementary === 1 && chance(80))
  )
    return calculator(value);
  return BinaryExpression(
    operator,
    encodeNumber(values[0]),
    encodeNumber(values[1]),
  );
}

function wrapExpression(expr: Node): Node {
  const option = choice(["array", "object", "sequence", "ternary", "raw"]);
  const rnd = encodeNumber(similarValue(0));
  if (option === "array") {
    const idx = chance(50) ? 1 : 0;
    const array = ArrayExpression([idx ? rnd : expr, idx ? expr : rnd]);
    if (chance(50))
      return CallExpression(MemberExpression(array, Literal("at")), [
        Literal(idx),
      ]);
    return MemberExpression(array, encodeNumber(idx));
  } else if (option === "object") {
    const real = getRandomIdentifier(4);
    let fake = real;
    while (real === fake) fake = getRandomIdentifier(4);
    const first = chance(50);
    return MemberExpression(
      ObjectExpression([
        Property(Literal(first ? real : fake), first ? expr : rnd),
        Property(Literal(first ? fake : real), first ? rnd : expr),
      ]),
      Literal(real),
    );
  } else if (option === "sequence") {
    return SequenceExpression([rnd, expr]);
  } else if (option === "ternary") {
    const first = chance(50);
    const comparison = chance(10)
      ? first
        ? getRandomTrueExpression()
        : getRandomFalseExpression()
      : first && chance(20)
      ? encodeNumber(similarValue(0))
      : encodeNumber(+first);
    return ConditionalExpression(
      comparison,
      first ? expr : rnd,
      first ? rnd : expr,
    );
  }

  return expr;
}

var zeroExpressions = [
  UnaryExpression("!", Literal(1)),
  ArrayExpression([]),
  Literal(""),
];
var oneExpressions = [
  UnaryExpression("!", Literal(0)),
  UnaryExpression("!", UnaryExpression("+", ObjectExpression([]))),
  UnaryExpression("!", UnaryExpression("+", ArrayExpression([]))),
];

function encodeNumber(value: number): Node {
  if (chance(1)) return wrapExpression(encodeNumber(value));
  if (chance(1)) return calculator(value);

  if ([-1, 0, 1].includes(value) && chance(80)) {
    if (value === -1) return UnaryExpression("-", choice(oneExpressions));

    if (value === 0)
      return UnaryExpression(choice(["+", "-"]), choice(zeroExpressions));

    return chance(50)
      ? UnaryExpression("+", choice(oneExpressions))
      : UnaryExpression("-", UnaryExpression("~", choice(zeroExpressions)));
  }

  if (chance(20)) return Literal(value);

  const hex = Identifier("0x" + Math.abs(value).toString(16));
  return value < 0 ? UnaryExpression("-", hex) : hex;
}

function similarValue(value: number): number {
  const range = Math.max(32768, Math.abs(value) * 0.1);
  const result = value + Math.floor(Math.random() * (2 * range) - range);
  // never return 0
  return result ? result : value ? value : 1;
}
