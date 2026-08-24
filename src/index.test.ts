import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cryptoRandom, dice, seededRandom } from './index.ts';

test('rolls stay in range and cover every face', () => {
  const d6 = dice('1d6');
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const value = d6.roll();
    assert.ok(Number.isInteger(value), `not an integer: ${value}`);
    assert.ok(value >= 1 && value <= 6, `out of range: ${value}`);
    seen.add(value);
  }
  assert.equal(seen.size, 6);
});

test('count defaults to 1', () => {
  const d20 = dice('d20');
  assert.equal(d20.count, 1);
  assert.equal(d20.notation, '1d20');
});

test('parses modifiers', () => {
  const plus = dice('2d6+3');
  assert.deepEqual(
    { count: plus.count, sides: plus.sides, modifier: plus.modifier, min: plus.min, max: plus.max },
    { count: 2, sides: 6, modifier: 3, min: 5, max: 15 },
  );

  const minus = dice('1d6-1');
  assert.equal(minus.modifier, -1);
  assert.equal(minus.notation, '1d6-1');
  assert.equal(minus.min, 0);
});

test('rng is injectable, hitting both bounds', () => {
  assert.equal(dice('3d6+2', () => 0).roll(), 5);
  assert.equal(dice('3d6+2', () => 0.999999).roll(), 20);
});

test('cryptoRandom stays in [0, 1) and drives a die', () => {
  for (let i = 0; i < 5000; i++) {
    const value = cryptoRandom();
    assert.ok(value >= 0 && value < 1, `out of range: ${value}`);
  }

  const d20 = dice('d20', cryptoRandom);
  const seen = new Set(Array.from({ length: 5000 }, () => d20.roll()));
  assert.equal(seen.size, 20);
});

test('rollAll reports the faces behind the total', () => {
  const d = dice('3d6+2', seededRandom(9));
  const { total, rolls } = d.rollAll();

  assert.equal(rolls.length, 3);
  for (const value of rolls) {
    assert.ok(Number.isInteger(value) && value >= 1 && value <= 6, `bad face: ${value}`);
  }
  assert.equal(
    rolls.reduce((sum, value) => sum + value, 0) + d.modifier,
    total,
    'total must be the faces plus the modifier',
  );
  assert.ok(total >= d.min && total <= d.max);
});

test('maxCount can be raised, and still guards by default', () => {
  assert.throws(() => dice('5000d6'), RangeError);
  assert.throws(() => dice('5000d6', undefined, { maxCount: 4999 }), RangeError);

  const many = dice('5000d6', () => 0, { maxCount: 5000 });
  assert.equal(many.count, 5000);
  assert.equal(many.rollAll().rolls.length, 5000);
});

test('seededRandom replays the same run, and different seeds diverge', () => {
  const run = (seed: number) => {
    const d = dice('2d6+3', seededRandom(seed));
    return Array.from({ length: 100 }, () => d.roll());
  };

  assert.deepEqual(run(42), run(42));
  assert.notDeepEqual(run(42), run(43));

  for (const value of run(7)) {
    assert.ok(Number.isInteger(value) && value >= 5 && value <= 15, `out of range: ${value}`);
  }

  const d20 = dice('d20', seededRandom(1));
  const seen = new Set(Array.from({ length: 5000 }, () => d20.roll()));
  assert.equal(seen.size, 20);
});

// Compile-time counterpart to the runtime check below: `tsc` fails if a bad
// literal stops being rejected, or if plain `string` stops being accepted.
// Never called — `dice('2d')` would throw.
export function _typeChecks(fromInput: string, union: '1d6' | 'd20') {
  // @ts-expect-error '2d' is not valid notation
  dice('2d');
  // @ts-expect-error 'd6+' is not valid notation
  dice('d6+');
  // @ts-expect-error a count is digits, and 1.5 dice is not a thing
  dice('1.5d6');
  // @ts-expect-error exponent notation is not a dice count
  dice('1e3d6');
  // @ts-expect-error a negative count is not a dice count
  dice('-1d6');
  // @ts-expect-error the runtime pattern allows no spaces
  dice('2d6 + 3');
  // @ts-expect-error one modifier, not two
  dice('1d6+1+1');
  dice('2d6+3');
  dice('4d8-1');
  dice('100d100+100');
  dice('d20', cryptoRandom);
  dice('2D6-1'); // case insensitive, matching the runtime pattern
  dice('50000d6', undefined, { maxCount: 50_000 });
  dice(fromInput);
  dice(union);
}

test('rejects bad notation', () => {
  for (const bad of ['', 'abc', '1d', 'd', '1d6+', '1d6+x', '2 d 6', '1d6+1+1', '-1d6']) {
    assert.throws(() => dice(bad), TypeError, `should reject ${JSON.stringify(bad)}`);
  }
  assert.throws(() => dice('1d0'), RangeError);
  assert.throws(() => dice('0d6'), RangeError);
  assert.throws(() => dice('5000d6'), RangeError);
});
