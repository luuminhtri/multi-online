import type { Game, GameSettings, Command, Role } from '../engine/types.ts';
import type { moderatorView, playerView } from '../engine/views.ts';
export interface Member { id: string; name: string; tokenHash: string; offline?: boolean; left?: boolean; }
export interface Room {
  schemaVersion: 1 | 2 | 3 | 4; lobbyRoles?: Role[]; readyPlayerIds?: string[]; gameStarted?: boolean; code: string; revision: number; createKey: string;
  createdAt: string; expiresAt: string; moderator: Member; members: Member[];
  game: Game | null;
  receipts: Record<string, string>;
}
export interface RoomRepository {
  mode: 'local' | 'supabase';
  read(code: string): Promise<Room | null>;
  findCreated(key: string): Promise<Room | null>;
  commit(room: Room, expectedRevision: number): Promise<boolean>;
  remove?(code: string, expectedRevision: number): Promise<boolean>;
}
export type Mutation =
  | { type: 'create'; requestId: string; name: string }
  | { type: 'join'; requestId: string; code: string; name: string }
  | { type: 'setOffline'; requestId: string; code: string; expectedRevision: number; playerId: string }
  | { type: 'removeMember'; requestId: string; code: string; expectedRevision: number; playerId: string }
  | { type: 'addOffline'; requestId: string; code: string; expectedRevision: number; name: string }
  | { type: 'offlineReady'; requestId: string; code: string; playerId: string }
  | { type: 'offlineCommand'; requestId: string; code: string; playerId: string; stepId: string; command: Command }
  | { type: 'reorder'; requestId: string; code: string; expectedRevision: number; playerIds: string[] }
  | { type: 'ready'; requestId: string; code: string }
  | { type: 'begin'; requestId: string; code: string; expectedRevision: number }
  | { type: 'setDeck'; requestId: string; code: string; expectedRevision: number; roles: Role[] }
  | { type: 'start'; requestId: string; code: string; expectedRevision: number; roles: Role[]; settings?: GameSettings }
  | { type: 'command'; requestId: string; code: string; stepId: string; command: Command };
interface SnapshotBase {
  controller?: 'moderator';
  room: { local?: boolean; simplified?: boolean; inspection?: number | null; debug: boolean; code: string; revision: number | null; phase: 'lobby' | 'ready' | 'playing' | 'ended'; readyPlayerIds: string[]; expiresAt: string; members: { id: string; name: string; seat: number; offline: boolean; left: boolean }[] };
  me: { id: string; name: string }; storage: 'local' | 'supabase'; serverTime: string;
  viewVersion: string; catalog: { id: Role; name: string; description: string; image: string | null }[];
  deck: Record<string, number> | null;
}
export type Snapshot = SnapshotBase & (
  { viewer: 'moderator'; game: ReturnType<typeof moderatorView> | null } |
  { viewer: 'player'; game: ReturnType<typeof playerView> | null }
);
