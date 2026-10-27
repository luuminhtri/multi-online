import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestNightDeaths, missingLibraryRoles, publicEventText } from '../src/online/presentation.ts';
import { ROLE_CATALOG } from '../src/catalog/roles.ts';
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

test('Thư viện nguồn tách đúng vai đã hỗ trợ khỏi vai chưa hỗ trợ', () => {
  const supported = [{ id: 'wolf', displayName: 'Ma Sói' }, { id: 'seer', displayName: 'Tiên tri' }];
  const library = [...supported, { id: 'mason', displayName: 'Sinh đôi' }, { id: 'tanner', displayName: 'Chán đời' }];
  assert.deepEqual(missingLibraryRoles(supported.map(r => r.id), library), [
    { id: 'mason', displayName: 'Sinh đôi' }, { id: 'tanner', displayName: 'Chán đời' },
  ]);
  assert.deepEqual(missingLibraryRoles(supported.map(r => r.id), supported), []);
});
test('Nhãn số vai: catalog đã hỗ trợ + vai thiếu bằng đúng 64 vai nguồn', async () => {
  const { supportedCatalog } = await import('../src/server/rooms.ts');
  const supported = supportedCatalog();
  const missing = missingLibraryRoles(supported.map(r => r.id), ROLE_CATALOG.map(r => ({ id: r.id, displayName: r.displayName })));
  assert.equal(supported.length + missing.length, ROLE_CATALOG.length);
  assert.equal(ROLE_CATALOG.length, 64);
  // Mọi vai đã hỗ trợ phải nằm trong thư viện nguồn (không có vai ngoài nguồn).
  for (const s of supported) assert.ok(!missing.some(m => m.id === s.id), s.id);
});


test('acknowledging any private ability result prevents its dialog reopening on the next snapshot',async()=>{
 const {latestAbilityResult}=await import('../src/online/presentation.ts');
 for(const type of ['inspection','aura-inspection','mystic-inspection','alignment-comparison','ability-result']){
  const messages:GameEvent[]=[{id:1,night:1,type:'inspection',audience:'private',data:{}},{id:2,night:2,type,audience:'private',data:{}},{id:3,night:2,type:'tapped',audience:'private',data:{}}];
  const displayed=latestAbilityResult(messages,1)!;assert.equal(displayed.id,2);const acknowledged=latestAbilityResult(messages)!.id;assert.equal(latestAbilityResult(messages,acknowledged),null);
 }
});
