import type { Room, RoomRepository } from './types.ts';
// Debug rooms never touch .local-rooms or cloud storage.
export class DebugRoomRepository implements RoomRepository {
  readonly mode = 'local' as const;
  private rooms = new Map<string, Room>();
  async read(code: string) { return structuredClone(this.rooms.get(code) ?? null); }
  async findCreated(key: string) { return structuredClone([...this.rooms.values()].find(r => r.createKey === key) ?? null); }
  async commit(room: Room, expectedRevision: number) {
    const old = this.rooms.get(room.code);
    if (expectedRevision === -1 ? !!old || [...this.rooms.values()].some(r => r.createKey === room.createKey) : !old || old.revision !== expectedRevision) return false;
    this.rooms.set(room.code, structuredClone(room)); return true;
  }
  async remove(code: string, expectedRevision: number) {
    if (this.rooms.get(code)?.revision !== expectedRevision) return false;
    return this.rooms.delete(code);
  }
}
