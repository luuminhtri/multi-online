import { createApiHandler } from '../src/server/http.ts';
import { configuredRepository } from '../src/server/repositories.ts';
import { RoomService } from '../src/server/rooms.ts';
let service: RoomService | undefined;
export default createApiHandler(() => service ??= new RoomService(configuredRepository(process.env, false)));
