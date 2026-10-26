import { mkdir, writeFile, access } from 'node:fs/promises';
import { ROLES } from '../src/engine/rules.ts';
import { ROLE_IMAGES } from '../src/catalog/images.ts';
await mkdir('public/offline-cards', { recursive: true });
const entries = Object.keys(ROLES);
async function worker() {
  while (entries.length) {
    const id = entries.shift(), path = `public/offline-cards/${id}.png`;
    try { await access(path); continue; } catch {}
    const response = await fetch(ROLE_IMAGES[id]);
    if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] !== 137 || bytes[1] !== 80) throw new Error(`${id}: expected PNG`);
    await writeFile(path, bytes);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Đã lưu ảnh offline cho ${Object.keys(ROLES).length} vai.`);
