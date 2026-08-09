# @dgrr-studio/dice

Minimal, fully typed dice roller. Declare a die once, roll it as often as you like.

- No dependencies, ESM only, ~40 lines of source
- Standard dice notation with modifiers: `1d6`, `d20`, `2d6+3`, `4d8-1`
- Bring your own random source for seeded or deterministic rolls

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

## API

### `dice(notation, rng?): Dice`

| Parameter  | Type            | Default       | Description                              |
| ---------- | --------------- | ------------- | ---------------------------------------- |
| `notation` | `string`        | —             | `NdS`, `NdS+M`, or `NdS-M`. `N` defaults to `1`. |
| `rng`      | `() => number`  | `Math.random` | Random source returning `[0, 1)`.        |

Throws `TypeError` if the notation cannot be parsed, and `RangeError` if the die
has fewer than one side, fewer than one die, or more than 1000 dice.

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
