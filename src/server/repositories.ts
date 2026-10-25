import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { ApiError } from './validation.ts';
import type { Room, RoomRepository } from './types.ts';

// Development only. One lock covers both code and createKey uniqueness, across
// processes as well as concurrent requests. Atomic rename precedes the ACK.
export class FileRoomRepository implements RoomRepository {
  readonly mode = 'local' as const;
  private directory: string;
  constructor(directory: string) { this.directory = directory; }
  private async all(): Promise<Record<string, Room>> {
    try { return JSON.parse(await readFile(join(this.directory, 'rooms.json'), 'utf8')); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return {}; throw e; }
  }
  async read(code: string) { return (await this.all())[code] ?? null; }
  async findCreated(key: string) { return Object.values(await this.all()).find(r => r.createKey === key) ?? null; }
  async commit(room: Room, expectedRevision: number) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockPath = join(this.directory, 'rooms.lock');
    let lock;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { lock = await open(lockPath, 'wx', 0o600); break; }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; await delay(10); }
    }
    if (!lock) throw new ApiError('STORAGE_BUSY', 503, true);
    const temp = join(this.directory, `${randomUUID()}.tmp`);
    try {
      const all = await this.all(), prior = all[room.code];
      if (expectedRevision === -1) {
        if (prior || Object.values(all).some(r => r.createKey === room.createKey)) return false;
      } else if (!prior || prior.revision !== expectedRevision) return false;
      if (room.revision !== expectedRevision + 1) throw new Error('Invalid storage revision');
      all[room.code] = room;
      const handle = await open(temp, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(all)); await handle.sync(); } finally { await handle.close(); }
      await rename(temp, join(this.directory, 'rooms.json'));
      return true;
    } finally {
      await unlink(temp).catch(() => {});
      await lock.close(); await unlink(lockPath);
    }
  }
}

// Real HTTP adapter. Keys stay on the Node server; the browser never talks to
// private tables. All write attempts use the SQL compare-and-swap RPC.
export class SupabaseRoomRepository implements RoomRepository {
  readonly mode = 'supabase' as const;
  private base: string;
  private key: string; private timeoutMs: number;
  constructor(url: string, key: string, timeoutMs = 5000) {
    this.key = key; this.timeoutMs = timeoutMs;
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(['127.0.0.1', 'localhost'].includes(parsed.hostname) && parsed.protocol === 'http:')) throw new Error('Unsafe storage URL');
    this.base = url.replace(/\/$/, '') + '/rest/v1';
  }
  private async request(path: string, body?: unknown): Promise<unknown> {
    try {
      const response = await fetch(this.base + path, { method: body === undefined ? 'GET' : 'POST',
        headers: { apikey: this.key, ...(this.key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${this.key}` }), 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs), redirect: 'error' });
      if (!response.ok) throw new Error('Storage request failed');
      return await response.json();
    } catch { throw new ApiError('STORAGE_UNAVAILABLE', 503, true); }
  }
  private async select(filter: string) {
    const rows = await this.request(`/ma_soi_rooms?select=document&${filter}&limit=1`);
    if (!Array.isArray(rows)) throw new ApiError('STORAGE_UNAVAILABLE', 503, true);
    return rows[0]?.document as Room | undefined ?? null;
  }
  async read(code: string) { return this.select(`code=eq.${encodeURIComponent(code)}`); }
  async findCreated(key: string) { return this.select(`create_key=eq.${encodeURIComponent(key)}`); }
  async commit(room: Room, expectedRevision: number) {
    const result = await this.request('/rpc/ma_soi_commit_room', { p_code: room.code, p_expected_revision: expectedRevision, p_document: room });
    if (typeof result !== 'boolean') throw new ApiError('STORAGE_UNAVAILABLE', 503, true);
    return result;
  }
}
export function configuredRepository(env: NodeJS.ProcessEnv, allowLocal: boolean): RoomRepository {
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.SUPABASE_URL && key) return new SupabaseRoomRepository(env.SUPABASE_URL, key);
  if (env.SUPABASE_URL || key || !allowLocal) throw new ApiError('STORAGE_NOT_CONFIGURED', 503);
  return new FileRoomRepository(env.ROOM_DATA_DIR ?? join(process.cwd(), '.local-rooms'));
}
