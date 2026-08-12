# @dgrr-studio/dice

Minimal, fully typed dice roller. Declare a die once, roll it as often as you like.

- No dependencies, ESM only, under 50 lines of source
- Standard dice notation with modifiers: `1d6`, `d20`, `2d6+3`, `4d8-1`
- Crypto-secure rolls included, or bring your own source for seeded and deterministic ones

## Why `@dgrr-studio/dice`?

If you need a small, typed dice engine rather than a full RPG framework, this
package stays small and predictable on purpose. What that buys you:

**A die is a value, not a function call.** Notation is parsed once, when you declare
the die. Rolling it a thousand times re-parses nothing, and `min`, `max`, `count`,
`sides`, and `modifier` are all readable without rolling at all — useful for showing
a damage range in a UI, or validating a stat block before play starts.

```ts
const attack = dice('2d6+3');
`${attack.min}–${attack.max}`; // "5–15", no roll needed
```

**Typos are a compile error, not a 3am exception.** Notation written as a literal
is checked against a template literal type, while values typed as `string` stay
allowed and are validated at runtime.

```ts
dice('2d6+3'); // fine
dice('2d'); // Type error: Invalid dice notation: 2d
dice(fromUserInput); // fine, throws at runtime if malformed
```

**Randomness is a parameter, not a global.** `rng` is the second argument, so
deterministic tests need no module mocking, no seeding side channel, no monkey
patching of `Math.random`.

```ts
dice('3d6+2', () => 0).roll(); // 5, every time
```

**Secure rolls without another dependency.** `cryptoRandom` ships in the same
2 kB, for the cases where a predictable `Math.random` is a real problem.

**Bad input fails loudly, and the failures are distinguishable.** Unparseable
notation throws `TypeError`; parseable-but-impossible dice throw `RangeError`. User
input can go straight in, and a hostile `999999d6` is refused rather than freezing
the event loop.

**Nothing lands in your lockfile.** Zero dependencies, 46 lines of source, ESM,
`sideEffects: false`. Small enough to read before you trust it.

### When to reach for something else

This library rolls one kind of die per declaration. If you need multi-term
expressions like `2d6+1d4`, keep-highest / keep-lowest for advantage, exploding
dice, or full probability distributions, a parser-based roller will serve you
better.

## Install

```sh
npm install @dgrr-studio/dice
```

## Usage

```ts
import { dice } from '@dgrr-studio/dice';

const d6 = dice('1d6');
d6.roll(); // 4
d6.roll(); // 1
d6.roll(); // 6

const attack = dice('2d6+3');
attack.roll(); // 11
attack.min; // 5
attack.max; // 15
```

Invalid notation throws, so runtime input is safe to pass straight in:

```ts
dice('1d6+'); // TypeError: Invalid dice notation: "1d6+"
dice('1d0'); // RangeError: A die needs at least 1 side: 1d0
```

### Deterministic rolls

`dice` takes any function returning a number in `[0, 1)` as its second argument,
which makes tests and seeded runs straightforward:

```ts
import { dice } from '@dgrr-studio/dice';

const loaded = dice('1d6', () => 0.999);
loaded.roll(); // always 6
```

### Secure rolls

`Math.random` is fast but predictable: given enough observed rolls, the next one
can be guessed. That is fine for a game, not for anything with money or secrets
riding on it. Pass `cryptoRandom` instead:

```ts
import { dice, cryptoRandom } from '@dgrr-studio/dice';

const fair = dice('d20', cryptoRandom);
fair.roll(); // backed by Web Crypto
```

## API

### `dice(notation, rng?): Dice`

| Parameter  | Type            | Default       | Description                              |
| ---------- | --------------- | ------------- | ---------------------------------------- |
| `notation` | `Notation \| string` | —        | `NdS`, `NdS+M`, or `NdS-M`. `N` defaults to `1`. |
| `rng`      | `() => number`  | `Math.random` | Random source returning `[0, 1)`.        |

String literals are checked against the `Notation` type at compile time; anything
typed as `string` is accepted and checked at runtime.

Throws `TypeError` if the notation cannot be parsed, and `RangeError` if the die
has fewer than one side, fewer than one die, or more than 1000 dice.

### `cryptoRandom(): number`

A drop-in `rng` returning `[0, 1)` with 32 bits of entropy from
`crypto.getRandomValues`. Requires the Web Crypto global: browsers, Deno, Bun,
and Node 19+ (Node 18 needs `--experimental-global-webcrypto`).

### `Dice`

| Member     | Type     | Description                                    |
| ---------- | -------- | ---------------------------------------------- |
| `roll()`   | `number` | Rolls every die and returns the sum plus the modifier. |
| `notation` | `string` | Normalized notation, e.g. `2d6+3`.             |
| `count`    | `number` | How many dice are rolled.                      |
| `sides`    | `number` | Faces per die.                                 |
| `modifier` | `number` | Flat value added to the sum, negative for `-M`. |
| `min`      | `number` | Lowest possible result.                        |
| `max`      | `number` | Highest possible result.                       |

## License

MIT
