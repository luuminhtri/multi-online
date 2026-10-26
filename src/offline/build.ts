import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

export function offlineShell(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'offline-shell', apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      const out = resolve(config.root, config.build.outDir);
      const files = (await readdir(out, { recursive: true })).filter(f => /\.(html|js|css|png|svg|webmanifest)$/.test(f) && f !== 'sw.js').sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(await readFile(resolve(out, file)));
      const version = `ma-soi-shell-${hash.digest('hex').slice(0, 16)}`;
      const source = `const CACHE = ${JSON.stringify(version)};
const FILES = ${JSON.stringify(files.map(f => '/' + f))};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ma-soi-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') return (await cache.match('/index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});\n`;
      await writeFile(resolve(out, 'sw.js'), source);
    },
  };
}
