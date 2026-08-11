/**
 * Dice notation, e.g. `1d6`, `d20`, `2d6+3`, `4d8-1`.
 *
 * The literal union only catches mistakes in string literals; runtime input is
 * validated by {@link dice} itself.
 */
export type Notation =
  | `${number}d${number}`
  | `d${number}`
  | `${number}d${number}${'+' | '-'}${number}`
  | `d${number}${'+' | '-'}${number}`;

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
}

const CRYPTO_BUFFER = new Uint32Array(1);

/**
 * Cryptographically secure random source, for when `Math.random` is not good
 * enough: `dice('d20', cryptoRandom)`.
 *
 * Needs the Web Crypto global, so browsers, Deno, Bun, and Node 19+. On Node 18
 * it requires `--experimental-global-webcrypto`.
 *
 * @returns a number in `[0, 1)` with 32 bits of entropy
 */
export function cryptoRandom(): number {
  return crypto.getRandomValues(CRYPTO_BUFFER)[0]! / 2 ** 32;
}

const PATTERN = /^(\d*)d(\d+)(?:([+-])(\d+))?$/i;

// ponytail: arbitrary cap so a hostile notation like "1e9d6" can't hang the
// event loop. Raise it if someone actually needs more dice.
const MAX_COUNT = 1000;

/**
 * Declare a die from dice notation.
 *
 * @param notation e.g. `1d6`, `d20`, `2d6+3`
 * @param rng source of randomness returning `[0, 1)`; defaults to `Math.random`
 * @throws {TypeError} if the notation cannot be parsed
 * @throws {RangeError} if the die has no faces or too many dice
 */
export function dice(notation: Notation | string, rng: () => number = Math.random): Dice {
  const match = PATTERN.exec(String(notation).trim());
  if (!match) {
    throw new TypeError(`Invalid dice notation: ${JSON.stringify(notation)}`);
  }

  const count = match[1] === '' ? 1 : Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[4] === undefined ? 0 : Number(match[4]) * (match[3] === '-' ? -1 : 1);

  if (sides < 1) throw new RangeError(`A die needs at least 1 side: ${notation}`);
  if (count < 1) throw new RangeError(`A roll needs at least 1 die: ${notation}`);
  if (count > MAX_COUNT) throw new RangeError(`At most ${MAX_COUNT} dice per roll: ${notation}`);

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
  };
}
