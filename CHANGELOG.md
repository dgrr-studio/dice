# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this package
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.3.0

A minor bump rather than a patch: npm treats `^0.2.2` as `<0.3.0`, so nobody is
carried onto this release by an install. Upgrading is a deliberate step, which
is what the TypeScript floor below deserves.

### Changed

- **Rolls are now cryptographically secure by default.** `rng` defaults to
  `cryptoRandom` instead of `Math.random`, so a die declared without an explicit
  source is backed by Web Crypto. Where the Web Crypto global is missing — among
  supported runtimes, only Node 18 started without
  `--experimental-global-webcrypto` — the default falls back to `Math.random`.
  Code that passes its own `rng` is unaffected; code that relied on the default
  keeps rolling in the same range, from a different source.

- **Notation literals are checked digit by digit.** The compile-time check now
  mirrors the runtime pattern exactly, so `1.5d6`, `1e3d6`, `-1d6`, and
  `2d6 + 3` are type errors instead of literals that compiled and then threw.
  The error also reads `Invalid dice notation: …` again rather than collapsing
  to `never`. This raises the minimum TypeScript version to 4.5.

### Added

- `seededRandom(seed)`, a deterministic `rng` (mulberry32) for replays, seeded
  runs, and tests: the same seed always produces the same sequence.
- `Dice.rollAll()`, returning `{ total, rolls }` so a result can be shown as the
  dice that produced it, not only as a sum.
- A third `options` argument with `maxCount`, which raises the 1000-dice cap for
  simulations that need it. The cap and its default are unchanged.

### Documentation

- Added a runtime support table: Node 18, Chrome/Edge 80, Firefox 74, Safari
  13.1, TypeScript 4.5. The TypeScript floor rose with the stricter notation
  check; earlier versions reject valid notation outright.
- Added a CommonJS section covering `require(esm)` on Node 20.19+/22.12+, the
  dynamic-import workaround for older Node, the `moduleResolution` requirement,
  and Jest's default CJS runtime.

## 0.2.2

- Sharpened the tagline and added npm badges.

## 0.2.1

- `Notation` accepts an uppercase separator, matching the runtime pattern.

## 0.2.0

- Dice notation literals are checked at compile time.
- Added `cryptoRandom`.

## 0.1.0

- Initial release: minimal typed dice roller.
