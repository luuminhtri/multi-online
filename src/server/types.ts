import type { Game, GameSettings, Command, Role } from '../engine/types.ts';
import type { moderatorView, playerView } from '../engine/views.ts';
export interface Member { id: string; name: string; tokenHash: string; }
export interface Room {
  schemaVersion: 1; code: string; revision: number; createKey: string;
  createdAt: string; expiresAt: string; moderator: Member; members: Member[];
  game: Game | null;
  receipts: Record<string, string>;
}
export interface RoomRepository {
  mode: 'local' | 'supabase';
  read(code: string): Promise<Room | null>;
  findCreated(key: string): Promise<Room | null>;
  commit(room: Room, expectedRevision: number): Promise<boolean>;
}
export type Mutation =
  | { type: 'create'; requestId: string; name: string }
  | { type: 'join'; requestId: string; code: string; name: string }
  | { type: 'reorder'; requestId: string; code: string; expectedRevision: number; playerIds: string[] }
  | { type: 'start'; requestId: string; code: string; expectedRevision: number; roles: Role[]; settings?: GameSettings }
  | { type: 'command'; requestId: string; code: string; stepId: string; command: Command };
interface SnapshotBase {
  room: { code: string; revision: number | null; phase: 'lobby' | 'playing' | 'ended'; expiresAt: string; members: { id: string; name: string; seat: number }[] };
  me: { id: string; name: string }; storage: 'local' | 'supabase'; serverTime: string;
  viewVersion: string; catalog: { id: Role; name: string; description: string; image: string | null }[];
}
export type Snapshot = SnapshotBase & (
  { viewer: 'moderator'; game: ReturnType<typeof moderatorView> | null } |
  { viewer: 'player'; game: ReturnType<typeof playerView> | null }
);
