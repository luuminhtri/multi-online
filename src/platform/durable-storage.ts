type SavedStorage = { version: 1; entries: Record<string, string> };

// Synchronous reads keep the existing engine unchanged. flush() is the explicit
// durable commit boundary: never acknowledge a local turn before it completes.
export class DurableStorage implements Storage {
  private entries: Map<string, string>;
  private committed: string;
  private writes: Promise<void> = Promise.resolve();
  private write: (value: string) => Promise<void>;
  constructor(saved: string | null, write: (value: string) => Promise<void>) {
    const data: unknown = saved ? JSON.parse(saved) : { version: 1, entries: {} };
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 ||
      !('entries' in data) || !data.entries || typeof data.entries !== 'object' || Array.isArray(data.entries) ||
      Object.values(data.entries).some(value => typeof value !== 'string')) throw new Error('Bản lưu iPhone không tương thích.');
    this.entries = new Map(Object.entries((data as SavedStorage).entries));
    this.committed = this.serialize();
    this.write = write;
  }
  get length() { return this.entries.size; }
  key(index: number) { return [...this.entries.keys()][index] ?? null; }
  getItem(key: string) { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string) { this.entries.set(key, String(value)); }
  removeItem(key: string) { this.entries.delete(key); }
  clear() { this.entries.clear(); }
  private serialize() { return JSON.stringify({ version: 1, entries: Object.fromEntries(this.entries) }); }
  checkpoint() { return this.serialize(); }
  restore(checkpoint: string) { this.entries = new Map(Object.entries((JSON.parse(checkpoint) as SavedStorage).entries)); }
  flush() {
    const value = this.serialize();
    const task = this.writes.catch(() => {}).then(async () => {
      if (value === this.committed) return;
      await this.write(value);
      this.committed = value;
    });
    this.writes = task;
    return task;
  }
}
