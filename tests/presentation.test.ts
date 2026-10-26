import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestNightDeaths, publicEventText } from '../src/online/presentation.ts';
import type { GameEvent } from '../src/engine/types.ts';
const event = (night: number, type: string, dead: string[], audience: GameEvent['audience'] = 'public'): GameEvent => ({ id: night, night, type, audience, data: { dead } });

test('Dấu X chỉ lấy kết quả đêm công khai mới nhất, bỏ người chết từ đêm trước và treo cổ', () => {
  const events = [event(1, 'morning', ['old']), event(2, 'morning', ['new', 'bond']), event(2, 'verdict', ['voted'])];
  assert.deepEqual(latestNightDeaths(events), ['new', 'bond']);
});
test('Resolve và thông tin riêng không lộ dấu X trước công bố', () => {
  assert.deepEqual(latestNightDeaths([event(1, 'deaths', ['secret'], 'moderator')]), []);
  assert.deepEqual(latestNightDeaths([event(1, 'morning', ['old']), event(2, 'morning', ['secret'], 'private')]), ['old']);
});
test('Sáng không ai chết xóa dấu X cũ, không sửa nguồn', () => {
  const events = [event(1, 'morning', ['old']), event(2, 'morning', [])];
  const copy = structuredClone(events);
  assert.deepEqual(latestNightDeaths(events), []);
  assert.deepEqual(events, copy);
});

test('Diễn biến ghi đúng Đêm/Sáng, người bị vote và trường hợp không ai chết', () => {
  const name = (id: unknown) => ({ b: 'B', c: 'C' })[String(id)] ?? String(id);
  assert.equal(publicEventText(event(1, 'morning', ['b']), name), 'Đêm 1: B đã chết.');
  assert.equal(publicEventText(event(2, 'morning', []), name), 'Đêm 2: Không có ai chết.');
  assert.equal(publicEventText({ ...event(1, 'verdict', []), data: { target: 'c' } }, name), 'Sáng 1: C bị vote chết.');
  assert.equal(publicEventText({ ...event(2, 'verdict', []), data: { target: null } }, name), 'Sáng 2: Không có ai chết.');
  assert.equal(publicEventText(event(1, 'deaths', ['c']), name), 'Sáng 1: C đã chết.');
});
