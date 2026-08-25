# @dgrr-studio/dice

[![npm](https://img.shields.io/npm/v/@dgrr-studio/dice)](https://www.npmjs.com/package/@dgrr-studio/dice)
[![test](https://github.com/dgrr-studio/dice/actions/workflows/test.yml/badge.svg)](https://github.com/dgrr-studio/dice/actions/workflows/test.yml)
[![bundle size](https://img.shields.io/bundlejs/size/@dgrr-studio/dice)](https://bundlejs.com/?q=%40dgrr-studio%2Fdice)

Minimal, zero-dependency TypeScript dice roller. Declare a die once, roll it as often as you like.

```ts
import { dice } from '@dgrr-studio/dice';

const attack = dice('2d6+3');
attack.roll(); // 11
attack.min; // 5 — the range is readable without rolling
```

- Typos are compile errors, not 3am exceptions: `dice('2d')` never ships
- Read `min`, `max`, and `count` without rolling — damage ranges in your UI
- `rollAll()` gives the total and the faces behind it: `{ total: 13, rolls: [4, 6] }`
- Crypto-secure by default; `seededRandom(42)` when a run must be replayable
- Standard notation with modifiers: `1d6`, `d20`, `2d6+3`, `4d8-1`
- Zero dependencies, ESM, under 1 kB gzipped

## Why `@dgrr-studio/dice`?

If you need a small, type-safe dice engine rather than a full RPG framework, this
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
is checked digit by digit against the same grammar the runtime enforces, while
values typed as `string` stay allowed and are validated at runtime.

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

**Secure by default, without another dependency.** Rolls are backed by Web
Crypto out of the box, so a predictable `Math.random` is never the thing
standing between a player and your loot table. Still under 1 kB gzipped.

**Bad input fails loudly, and the failures are distinguishable.** Unparseable
notation throws `TypeError`; parseable-but-impossible dice throw `RangeError`. User
input can go straight in, and a hostile `999999d6` is refused rather than freezing
the event loop.

**Nothing lands in your lockfile.** Zero dependencies, under 1 kB gzipped, ESM,
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

### Runtime support

| Runtime          | Minimum |
| ---------------- | ------- |
| Node             | 18 (tested on 18, 22, 24) |
| Chrome / Edge    | 80      |
| Firefox          | 74      |
| Safari           | 13.1 (iOS 13.4) |
| Deno, Bun, Workers | any current release |
| TypeScript       | 4.5     |

The browser floor is set by one optional chaining expression; everything else
in the published output is ES2016 or older. `crypto.getRandomValues` is not
restricted to secure contexts, so rolls work on plain HTTP too.

Two details worth knowing:

- Rolls are backed by Web Crypto from Node 19 on. Node 18 has no Web Crypto
  global unless started with `--experimental-global-webcrypto`, so the default
  `rng` falls back to `Math.random` there — see [Crypto-secure rolls](#crypto-secure-rolls).
- TypeScript must resolve `exports`, so `moduleResolution` has to be `node16`,
  `nodenext`, or `bundler` — see [CommonJS projects](#commonjs-projects).

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

To show the dice behind a result, not just the total, roll them all at once:

```ts
const { total, rolls } = dice('3d6+2').rollAll();
total; // 13
rolls; // [4, 6, 1] — the faces that produced it
```

Invalid notation throws, so runtime input is safe to pass straight in:

```ts
dice('1d6+'); // TypeError: Invalid dice notation: "1d6+"
dice('1d0'); // RangeError: A die needs at least 1 side: 1d0
```

### Deterministic and seeded rolls

`dice` takes any function returning a number in `[0, 1)` as its second argument,
which makes tests and seeded runs straightforward:

```ts
import { dice } from '@dgrr-studio/dice';

const loaded = dice('1d6', () => 0.999);
loaded.roll(); // always 6
```

For a run you can replay rather than a value you can pin, seed `seededRandom`:

```ts
import { dice, seededRandom } from '@dgrr-studio/dice';

const run = dice('2d6+3', seededRandom(42));
run.roll(); // same seed, same sequence, every time
```

Record the seed and you can reproduce the whole run later — useful for replays,
bug reports, and verifying a result after the fact. Reproduction replays the
calls in order, so give each die its own generator unless you also record the
order they were rolled in.

### Crypto-secure rolls

`Math.random` is fast but predictable: given enough observed rolls, the next one
can be guessed. That is fine for a game, not for anything with money or secrets
riding on it, so rolls use `cryptoRandom` unless you pass an `rng` of your own:

```ts
import { dice } from '@dgrr-studio/dice';

dice('d20').roll(); // backed by Web Crypto
```

Where the Web Crypto global is missing the default falls back to `Math.random`.
Among the supported runtimes that is only Node 18 started without
`--experimental-global-webcrypto`; pass `cryptoRandom` explicitly if you would
rather that case throw than silently downgrade.

## API

### `dice(notation, rng?, options?): Dice`

| Parameter  | Type            | Default       | Description                              |
| ---------- | --------------- | ------------- | ---------------------------------------- |
| `notation` | `Notation \| string` | —        | `NdS`, `NdS+M`, or `NdS-M`. `N` defaults to `1`. |
| `rng`      | `() => number`  | `cryptoRandom` | Random source returning `[0, 1)`. Falls back to `Math.random` without Web Crypto. |
| `options.maxCount` | `number` | `1000`        | Largest `N` accepted in `NdS`.           |

String literals are checked at compile time against the same grammar the runtime
pattern enforces, so `1.5d6` and `2d6 + 3` are type errors; anything typed as
`string` is accepted and checked at runtime. The exported `Notation` type is a
looser approximation, for annotating values that hold notation.

Throws `TypeError` if the notation cannot be parsed, and `RangeError` if the die
has fewer than one side, fewer than one die, or more than `maxCount` dice. The
default cap keeps a hostile `999999d6` from freezing the event loop; a
simulation that really does roll more can raise it:

```ts
dice('50000d6', undefined, { maxCount: 50_000 });
```

### `cryptoRandom(): number`

The default `rng`, returning `[0, 1)` with 32 bits of entropy from
`crypto.getRandomValues`. Requires the Web Crypto global: browsers, Deno, Bun,
and Node 19+ (Node 18 needs `--experimental-global-webcrypto`). Exported so you
can pass it explicitly and get a throw, rather than the `Math.random` fallback,
where the global is missing.

### `seededRandom(seed): () => number`

A deterministic `rng` (mulberry32): the same seed always produces the same
sequence. 32 bits of state — enough to replay a game, not to secure one, which
is what `cryptoRandom` is for.

### `Dice`

| Member     | Type     | Description                                    |
| ---------- | -------- | ---------------------------------------------- |
| `roll()`   | `number` | Rolls every die and returns the sum plus the modifier. |
| `rollAll()` | `{ total, rolls }` | The same total, plus the face each die landed on. |
| `notation` | `string` | Normalized notation, e.g. `2d6+3`.             |
| `count`    | `number` | How many dice are rolled.                      |
| `sides`    | `number` | Faces per die.                                 |
| `modifier` | `number` | Flat value added to the sum, negative for `-M`. |
| `min`      | `number` | Lowest possible result.                        |
| `max`      | `number` | Highest possible result.                       |

## CommonJS projects

This package is ESM only. On Node 20.19+ or 22.12+, `require()` works anyway —
`require(esm)` handles it, since nothing here uses top-level await:

```js
const { dice } = require('@dgrr-studio/dice');
```

On older Node, that throws `ERR_REQUIRE_ESM` and you need a dynamic import,
which makes loading asynchronous:

```js
let dice;
async function init() {
  ({ dice } = await import('@dgrr-studio/dice'));
}
```

Two things bite before the runtime ever does:

- **TypeScript** must be on `moduleResolution: "node16"`, `"nodenext"`, or
  `"bundler"`. The older `"node"` resolver ignores `exports`, and this package
  has no `main`, so it reports `Cannot find module '@dgrr-studio/dice' or its
  corresponding type declarations`. With `"node16"`, importing from a CJS file
  is `TS1479` — use the dynamic import above, and keep `module` at `"node16"` or
  later so it is not downlevelled back into a `require()`.
- **Jest** on its default CJS runtime does not transform `node_modules`, so the
  ESM source reaches it verbatim: `SyntaxError: Cannot use import statement
  outside a module`. Run Jest in ESM mode or exempt this package from
  `transformIgnorePatterns`. Vitest, webpack, Vite, esbuild, and Next need
  nothing.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT
