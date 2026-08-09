import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dice } from './index.ts';

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

test('rejects bad notation', () => {
  for (const bad of ['', 'abc', '1d', 'd', '1d6+', '1d6+x', '2 d 6', '1d6+1+1', '-1d6']) {
    assert.throws(() => dice(bad), TypeError, `should reject ${JSON.stringify(bad)}`);
  }
  assert.throws(() => dice('1d0'), RangeError);
  assert.throws(() => dice('0d6'), RangeError);
  assert.throws(() => dice('5000d6'), RangeError);
});
