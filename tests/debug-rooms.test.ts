import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { DebugRoomRepository } from '../src/server/debug-rooms.ts';
import { RoomService } from '../src/server/rooms.ts';
const token = () => randomBytes(32).toString('hex');

test('debug host exit deletes ephemeral room; guest cannot delete; normal mode cannot enable delete', async t => {
  const repository = new DebugRoomRepository();
  const service = new RoomService(repository, undefined, { debug: true, debugExitDelayMs: 10, debugLeaseMs: 1000 });
  t.after(() => service.dispose());
  const owner = token(), guest = token();
  const created = await service.mutate({ type: 'create', requestId: 'create', name: 'Host' }, owner);
  await service.mutate({ type: 'join', requestId: 'join', code: created.room.code, name: 'A' }, guest);
  await assert.rejects(service.closeDebug(created.room.code, guest), { code: 'MODERATOR_REQUIRED' });
  await assert.rejects(service.mutate({ type: 'join', requestId: 'duplicate', code: created.room.code, name: 'A' }, token()), { code: 'DUPLICATE_NAME' });
  await assert.rejects(new RoomService(repository).closeDebug(created.room.code, owner), { code: 'DEBUG_UNAVAILABLE' });
  await service.closeDebug(created.room.code, owner);
  await delay(30);
  assert.equal(await repository.read(created.room.code), null);
});
test('debug reload cancels exit grace; abandoned host lease expires; no persistent repository involved', async t => {
  const repository = new DebugRoomRepository();
  const service = new RoomService(repository, undefined, { debug: true, debugExitDelayMs: 10, debugLeaseMs: 80 });
  t.after(() => service.dispose());
  const owner = token(); const created = await service.mutate({ type: 'create', requestId: 'create', name: 'Host' }, owner);
  await service.closeDebug(created.room.code, owner);
  await service.read(created.room.code, owner);
  await delay(25); assert.ok(await repository.read(created.room.code));
  await delay(80); assert.equal(await repository.read(created.room.code), null);
});

test('debug deletion retries when a concurrent action changes the room revision', async t => {
  class RacingRepository extends DebugRoomRepository {
    private raced = false;
    override async remove(code: string, revision: number) {
      if (!this.raced) {
        this.raced = true;
        const room = (await this.read(code))!;
        room.revision++;
        await this.commit(room, revision);
        return false;
      }
      return super.remove(code, revision);
    }
  }
  const repository = new RacingRepository();
  const service = new RoomService(repository, undefined, { debug: true, debugExitDelayMs: 5, debugLeaseMs: 1000 });
  t.after(() => service.dispose());
  const owner = token(); const room = await service.mutate({ type: 'create', requestId: 'create', name: 'Host' }, owner);
  await service.closeDebug(room.room.code, owner);
  await delay(100);
  assert.equal(await repository.read(room.room.code), null);
});
