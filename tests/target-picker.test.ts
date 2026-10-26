import test from 'node:test';
import assert from 'node:assert/strict';
import { pickTarget, visiblePackIds, type TargetSlot } from '../src/online/target-picker.ts';
const slots: TargetSlot[] = [{ id: 'first', targets: ['a','b','c'], optional: false }, { id: 'second', targets: ['a','b','c'], optional: true }];
test('avatar selection rejects unavailable/self/dead targets supplied outside legal projection', () => {
  assert.equal(pickTarget(slots, {}, 'first', 'dead', true), null);
  assert.equal(pickTarget(slots, {}, 'unknown', 'a', true), null);
  assert.equal(pickTarget(slots, {}, 'first', '', true), null);
});
test('two-target choices remain distinct; changing a slot preserves other selections and input', () => {
  const values = { first: 'a', second: 'b' };
  assert.deepEqual(pickTarget(slots, values, 'second', 'a', true), { first: '', second: 'a' });
  assert.deepEqual(values, { first: 'a', second: 'b' });
  assert.deepEqual(pickTarget(slots, values, 'second', '', true), { first: 'a', second: '' });
});
test('witch can choose the same heal and poison target without clearing either', () => {
  assert.deepEqual(pickTarget(slots, { first: 'a', second: 'b' }, 'second', 'a', false), { first: 'a', second: 'a' });
});


test('red rings require awake wolf turn and only use living IDs from the authorized pack projection', () => {
  const view = { turn: { ability: 'wolves', awake: true }, pack: [{ id: 'known', alive: true }, { id: 'dead', alive: false }] };
  assert.deepEqual(visiblePackIds(view), ['known']);
  assert.deepEqual(visiblePackIds({ ...view, turn: { ability: 'wolves', awake: false } }), []);
  assert.deepEqual(visiblePackIds({ ...view, turn: { ability: 'seer', awake: true } }), []);
  assert.deepEqual(visiblePackIds({ ...view, pack: null }), []);
  assert.deepEqual(visiblePackIds(null), []);
});
