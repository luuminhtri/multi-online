import test from 'node:test';
import assert from 'node:assert/strict';
import { randomId } from '../src/shared/random-id.ts';

test('random IDs use native UUID when available', () => {
  let called = false;
  const source = { randomUUID() { called = true; return '12345678-1234-4123-8123-123456789abc' as const; }, getRandomValues: crypto.getRandomValues.bind(crypto) };
  assert.equal(randomId(source), '12345678-1234-4123-8123-123456789abc');
  assert(called);
});

test('HTTP fallback uses secure bytes with UUID v4 version and variant bits', () => {
  const source = { getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    assert(array instanceof Uint8Array); array.fill(255); return array;
  } };
  assert.equal(randomId(source), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  const secureSource = { getRandomValues: crypto.getRandomValues.bind(crypto) };
  const ids = Array.from({ length: 256 }, () => randomId(secureSource));
  assert.equal(new Set(ids).size, ids.length);
  assert(ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)));
});
