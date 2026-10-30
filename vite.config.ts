import { defineConfig, loadEnv } from 'vite';
import { offlineShell } from './src/offline/build.ts';
import { resolve } from 'node:path';
import { createApiHandler } from './src/server/http.ts';
import { configuredRepository } from './src/server/repositories.ts';
import { DebugRoomRepository } from './src/server/debug-rooms.ts';
import { RoomService } from './src/server/rooms.ts';
import { DEFAULT_ONLINE_ORIGIN, onlineOrigin } from './src/platform/urls.ts';
export default defineConfig(({ mode, command }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  const debug = command === 'serve' && mode === 'debug';
  const native = mode === 'ios';
  if (native) onlineOrigin(env.VITE_ONLINE_ORIGIN || DEFAULT_ONLINE_ORIGIN);
  return {
    define: { 'import.meta.env.DEBUG_TOOLS': JSON.stringify(debug), 'import.meta.env.NATIVE_APP': JSON.stringify(native) },
    plugins: [...(native ? [] : [offlineShell()]), { name: 'local-room-api', configureServer(server) {
      // Chặn cả HTML và mã nguồn thử nghiệm ở dev thường.
      server.middlewares.use((req, res, next) => {
        let path: string;
        try { path = decodeURIComponent((req.url ?? '/').split('?')[0]); }
        catch { res.statusCode = 400; res.end(); return; }
        if (!debug && /(?:^|\/)(?:debug|sandbox)(?:[/.]|$)/i.test(path)) {
          res.statusCode = 404; res.end(); return;
        }
        next();
      });
      let service: RoomService | undefined;
      const handler = createApiHandler(() => service ??= new RoomService(debug ? new DebugRoomRepository() : configuredRepository(env, true), undefined, { debug }));
      server.middlewares.use('/api/room', handler);
      server.httpServer?.once('close', () => service?.dispose());
    } }],
    server: { fs: { deny: ['.env', '.env.*', '**/.local-rooms/**', '**/src/server/**', '**/api/**', ...(!debug ? ['**/debug/**', '**/src/debug/**'] : [])] } },
    build: { outDir: native ? 'dist-ios' : 'dist', rollupOptions: { input: { main: resolve('index.html') } } },
  };
});
