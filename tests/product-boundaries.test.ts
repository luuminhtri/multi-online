import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, createServer } from 'vite';

const privatePaths = ['/sandbox.html', '/debug/sandbox.html', '/src/debug/sandbox/main.ts', '/src/debug/players.ts'];

for (const mode of ['development', 'debug']) {
  test(`Vite ${mode}: công cụ thử chỉ được phục vụ trong debug`, async () => {
    const server = await createServer({ mode, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
    try {
      await server.listen();
      const address = server.httpServer!.address();
      assert.ok(address && typeof address !== 'string');
      const origin = `http://127.0.0.1:${address.port}`;
      assert.equal((await fetch(origin)).status, 200);
      for (const path of privatePaths) {
        if (mode === 'debug' && path === '/sandbox.html') continue; // đường dẫn cũ đã bỏ
        const response = await fetch(origin + path);
        assert.equal(response.status, mode === 'debug' ? 200 : 404, path);
      }
      if (mode !== 'debug') {
        for (const path of ['/src/%64ebug/players.ts', '/@fs' + process.cwd() + '/src/debug/players.ts']) {
          assert.equal((await fetch(origin + path)).status, 404, path);
        }
      }
    } finally { await server.close(); }
  });
}

test('Mọi build, kể cả --mode debug, chỉ xuất sản phẩm', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'ma-soi-build-'));
  try {
    for (const mode of ['production', 'debug']) {
      const outDir = join(temp, mode);
      await build({ mode, logLevel: 'silent', build: { outDir } });
      const files = await readdir(outDir, { recursive: true });
      assert.deepEqual(files.filter(f => f.endsWith('.html')), ['index.html']);
      const content = (await Promise.all(files.filter(f => /\.(?:html|js|css)$/.test(f)).map(f => readFile(join(outDir, f), 'utf8')))).join('\n');
      for (const forbidden of ['sandbox', 'join-test', 'test-switch', 'test-add', 'test-bar', 'ma-soi:test:v1', 'Chế độ thử 1 tab', 'BÀN THỬ', 'Chuyện trong làng', 'Ai còn thức?']) {
        assert.ok(!content.includes(forbidden), `${mode} chứa ${forbidden}`);
      }
    }
  } finally { await rm(temp, { recursive: true, force: true }); }
});
