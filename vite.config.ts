import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { createApiHandler } from './src/server/http.ts';
import { configuredRepository } from './src/server/repositories.ts';
import { RoomService } from './src/server/rooms.ts';
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  return {
    plugins: [{ name: 'local-room-api', configureServer(server) {
      let service: RoomService | undefined;
      const handler = createApiHandler(() => service ??= new RoomService(configuredRepository(env, true)));
      server.middlewares.use('/api/room', handler);
    } }],
    server: { fs: { deny: ['.env', '.env.*', '**/.local-rooms/**', '**/src/server/**', '**/api/**'] } },
    build: { rollupOptions: { input: { main: resolve('index.html'), sandbox: resolve('sandbox.html') } } },
  };
});
