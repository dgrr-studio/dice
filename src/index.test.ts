import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cryptoRandom, dice } from './index.ts';

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

// Compile-time counterpart to the runtime check below: `tsc` fails if a bad
// literal stops being rejected, or if plain `string` stops being accepted.
// Never called — `dice('2d')` would throw.
function _typeChecks(fromInput: string) {
  // @ts-expect-error '2d' is not valid notation
  dice('2d');
  // @ts-expect-error 'd6+' is not valid notation
  dice('d6+');
  dice('2d6+3');
  dice('d20', cryptoRandom);
  dice('2D6-1'); // case insensitive, matching the runtime pattern
  dice(fromInput);
}

test('rejects bad notation', () => {
  for (const bad of ['', 'abc', '1d', 'd', '1d6+', '1d6+x', '2 d 6', '1d6+1+1', '-1d6']) {
    assert.throws(() => dice(bad), TypeError, `should reject ${JSON.stringify(bad)}`);
  }
  assert.throws(() => dice('1d0'), RangeError);
  assert.throws(() => dice('0d6'), RangeError);
  assert.throws(() => dice('5000d6'), RangeError);
});
