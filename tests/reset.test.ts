import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomService } from '../src/server/rooms.ts';
import { parseMutation } from '../src/server/validation.ts';
import type { Room, RoomRepository, Mutation } from '../src/server/types.ts';

test('online reset authority, seats, secrets, stale revision and retry after redeal', async () => {
  let room: Room | null = null;
  const repository: RoomRepository = { mode: 'local', async read() { return structuredClone(room); }, async findCreated() { return null; }, async commit(next, revision) { if ((room?.revision ?? -1) !== revision) return false; room = structuredClone(next); return true; } };
  const service = new RoomService(repository);
  let serial = 0;
  const send = (token: string, op: Record<string, unknown>) => service.mutate(parseMutation({ requestId: `r${++serial}`, ...op }), token);
  let s = await send('owner', { type: 'create', name: 'Quản trò' }); const code = s.room.code;
  for (const name of ['A', 'B', 'C']) s = await send(name, { type: 'join', code, name });
  s = await send('owner', { type: 'start', code, expectedRevision: room!.revision, roles: ['wolf', 'seer', 'villager'] });
  const seats = s.room.members;
  const reset = parseMutation({ type: 'reset', requestId: 'reset', code, expectedRevision: room!.revision });
  await assert.rejects(service.mutate(reset, 'A'), /MODERATOR_REQUIRED/);
  await assert.rejects(service.mutate({ ...reset, expectedRevision: 0 } as Mutation, 'owner'), /STALE_ROOM/);
  s = await service.mutate(reset, 'owner');
  assert.equal(s.game, null); assert.equal(s.room.phase, 'lobby'); assert.deepEqual(s.room.members, seats);
  assert.deepEqual(s.room.readyPlayerIds, []); assert.deepEqual(s.deck, { wolf: 1, seer: 1, villager: 1 });
  assert.equal((await service.read(code, 'A')).game, null);
  assert.equal((await service.mutate(reset, 'owner')).room.revision, s.room.revision);
  await send('owner', { type: 'start', code, expectedRevision: room!.revision, roles: ['wolf', 'seer', 'villager'] });
  assert.equal((await service.mutate(reset, 'owner')).room.phase, 'ready');
});
