/**
 * Dice notation, e.g. `1d6`, `d20`, `2d6+3`, `4d8-1`, for annotating a value
 * that holds notation.
 *
 * `${number}` is looser than the runtime pattern — it also matches `1.5` and
 * `1e3` — so this type approximates. Arguments passed to {@link dice} are held
 * to the exact grammar instead, digit by digit.
 */
export type Notation =
  | `${number}${D}${number}`
  | `${D}${number}`
  | `${number}${D}${number}${'+' | '-'}${number}`
  | `${D}${number}${'+' | '-'}${number}`;

/** The separator is case insensitive at runtime, so `2D6` is valid too. */
type D = 'd' | 'D';

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** True when `S` is one or more digits and nothing else. */
type IsDigits<S extends string> = S extends `${infer Head}${infer Rest}`
  ? Head extends Digit
    ? Rest extends ''
      ? true
      : IsDigits<Rest>
    : false
  : false;

/** True for `S` or `S+M` or `S-M`, all digits. */
type IsSidesAndModifier<S extends string> = IsDigits<S> extends true
  ? true
  : S extends `${infer Sides}${'+' | '-'}${infer Modifier}`
    ? IsDigits<Sides> extends true
      ? IsDigits<Modifier>
      : false
    : false;

/** The compile-time twin of {@link PATTERN}: `NdS`, `NdS+M`, or `NdS-M`. */
type IsNotation<S extends string> = S extends `${infer Count}${D}${infer Rest}`
  ? (Count extends '' ? true : IsDigits<Count>) extends true
    ? IsSidesAndModifier<Rest>
    : false
  : false;

/**
 * Accepts `T` when it is valid notation, or when it is no narrower than
 * `string` (so runtime input still type checks). A bad literal resolves to a
 * message instead, which fails to match `T` and surfaces as the error.
 */
type Checked<T extends string> = string extends T
  ? T
  : IsNotation<T> extends true
    ? T
    : `Invalid dice notation: ${T}`;

/** A declared die, ready to be rolled any number of times. */
export interface Dice {
  /** Normalized notation, e.g. `2d6+3`. */
  readonly notation: string;
  /** How many dice are rolled. */
  readonly count: number;
  /** Faces per die. */
  readonly sides: number;
  /** Flat value added to the sum (negative for `-N`). */
  readonly modifier: number;
  /** Lowest possible result. */
  readonly min: number;
  /** Highest possible result. */
  readonly max: number;
  /** Roll every die and return the sum plus the modifier. */
  roll(): number;
  /**
   * Roll every die and return the same total alongside the face each die
   * landed on, for showing the dice behind a result.
   */
  rollAll(): { total: number; rolls: number[] };
}

/** Options for {@link dice}. */
export interface DiceOptions {
  /**
   * Largest `N` accepted in `NdS`. Defaults to 1000, which keeps a hostile
   * `999999d6` from freezing the event loop; raise it for simulations that
   * really do roll that many dice at once.
   */
  maxCount?: number;
}

const CRYPTO_BUFFER = new Uint32Array(1);

/**
 * Cryptographically secure random source, and the default one {@link dice}
 * rolls with.
 *
 * Needs the Web Crypto global, so browsers, Deno, Bun, and Node 19+. On Node 18
 * it requires `--experimental-global-webcrypto`.
 *
 * @returns a number in `[0, 1)` with 32 bits of entropy
 */
export function cryptoRandom(): number {
  return crypto.getRandomValues(CRYPTO_BUFFER)[0]! / 2 ** 32;
}

/**
 * Deterministic random source, for replays, seeded runs, and tests: the same
 * seed always produces the same sequence.
 *
 * ```ts
 * const run = dice('2d6+3', seededRandom(42));
 * ```
 *
 * Reproducing a run means replaying the calls in the same order, so give each
 * die its own generator unless you also record the order they were rolled in.
 *
 * @param seed any number; only its low 32 bits matter
 * @returns a fresh generator returning numbers in `[0, 1)`
 */
export function seededRandom(seed: number): () => number {
  // ponytail: mulberry32. 32 bits of state, which is plenty to replay a game
  // and nowhere near enough to secure one — that is what cryptoRandom is for.
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/**
 * Web Crypto where the runtime has it, `Math.random` otherwise. The only
 * supported runtime without it is Node 18 started without
 * `--experimental-global-webcrypto`.
 */
const defaultRandom: () => number =
  typeof globalThis.crypto?.getRandomValues === 'function' ? cryptoRandom : Math.random;

const PATTERN = /^(\d*)d(\d+)(?:([+-])(\d+))?$/i;

// Arbitrary cap so a hostile notation like "999999d6" can't hang the event
// loop. Callers that really do need more can raise it through `maxCount`.
const MAX_COUNT = 1000;

/**
 * Declare a die from dice notation.
 *
 * String literals are checked at compile time, so `dice('2d')` is a type error.
 * Values typed as `string` are accepted and validated at runtime instead.
 *
 * @param notation e.g. `1d6`, `d20`, `2d6+3`
 * @param rng source of randomness returning `[0, 1)`; defaults to
 *   {@link cryptoRandom}, falling back to `Math.random` where Web Crypto is
 *   missing
 * @param options see {@link DiceOptions}
 * @throws {TypeError} if the notation cannot be parsed
 * @throws {RangeError} if the die has no faces or too many dice
 */
export function dice<T extends string>(
  notation: Checked<T>,
  rng: () => number = defaultRandom,
  { maxCount = MAX_COUNT }: DiceOptions = {},
): Dice {
  const match = PATTERN.exec(String(notation).trim());
  if (!match) {
    throw new TypeError(`Invalid dice notation: ${JSON.stringify(notation)}`);
  }

  const count = match[1] === '' ? 1 : Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[4] === undefined ? 0 : Number(match[4]) * (match[3] === '-' ? -1 : 1);

  if (sides < 1) throw new RangeError(`A die needs at least 1 side: ${notation}`);
  if (count < 1) throw new RangeError(`A roll needs at least 1 die: ${notation}`);
  if (count > maxCount) throw new RangeError(`At most ${maxCount} dice per roll: ${notation}`);

  const suffix = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;

  return {
    notation: `${count}d${sides}${suffix}`,
    count,
    sides,
    modifier,
    min: count + modifier,
    max: count * sides + modifier,
    roll() {
      let total = modifier;
      for (let i = 0; i < count; i++) total += Math.floor(rng() * sides) + 1;
      return total;
    },
    rollAll() {
      const rolls: number[] = [];
      let total = modifier;
      for (let i = 0; i < count; i++) {
        const value = Math.floor(rng() * sides) + 1;
        rolls.push(value);
        total += value;
      }
      return { total, rolls };
    },
  };
}
