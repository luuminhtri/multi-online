import { createHash, randomInt, randomUUID } from 'node:crypto';
import { createGame, dispatch, RuleError } from '../engine/engine.ts';
import { moderatorView, playerView } from '../engine/views.ts';
import { ROLES, RULES } from '../engine/rules.ts';
import type { Role } from '../engine/types.ts';
import type { Member, Mutation, Room, RoomRepository, Snapshot } from './types.ts';
import { ApiError, requireApi } from './validation.ts';

const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const supportedCatalog = () => (Object.keys(ROLES) as Role[]).map(id => ({ id, ...ROLES[id] }));
export class RoomService {
  readonly repository: RoomRepository; private now: () => number;
  constructor(repository: RoomRepository, now = () => Date.now()) { this.repository = repository; this.now = now; }
  private valid(room: Room | null): asserts room is Room {
    requireApi(room && Date.parse(room.expiresAt) > this.now(), 'ROOM_NOT_FOUND', 404);
    requireApi(room.schemaVersion === 1, 'ROOM_VERSION_UNSUPPORTED', 409);
    requireApi(!room.game || (room.game.rulesVersion === RULES.version && room.game.schemaVersion === 3), 'GAME_VERSION_UNSUPPORTED', 409);
  }
  private member(room: Room, tokenHash: string): { member: Member; moderator: boolean } {
    if (room.moderator.tokenHash === tokenHash) return { member: room.moderator, moderator: true };
    const member = room.members.find(m => m.tokenHash === tokenHash);
    requireApi(member, 'SESSION_NOT_IN_ROOM', 403); return { member, moderator: false };
  }
  project(room: Room, tokenHash: string): Snapshot {
    this.valid(room); const identity = this.member(room, tokenHash);
    const payload = {
      room: { code: room.code, revision: identity.moderator || !room.game ? room.revision : null,
        phase: !room.game ? 'lobby' as const : room.game.step === 'ended' ? 'ended' as const : 'playing' as const,
        expiresAt: room.expiresAt, members: room.members.map((m, i) => ({ id: m.id, name: m.name, seat: i + 1 })) },
      me: { id: identity.member.id, name: identity.member.name },
      storage: this.repository.mode, catalog: supportedCatalog(),
      ...(identity.moderator ? { viewer: 'moderator' as const, game: room.game ? moderatorView(room.game) : null }
        : { viewer: 'player' as const, game: room.game ? playerView(room.game, identity.member.id) : null }),
    };
    return { ...payload, viewVersion: hash(JSON.stringify(payload)), serverTime: new Date(this.now()).toISOString() } as Snapshot;
  }
  async read(code: string, token: string) { const room = await this.repository.read(code); this.valid(room); return this.project(room, hash(token)); }
  async mutate(operation: Mutation, token: string): Promise<Snapshot> {
    const tokenHash = hash(token);
    if (operation.type === 'create') {
      const createKey = hash(JSON.stringify([tokenHash, operation.requestId]));
      for (let attempt = 0; attempt < 8; attempt++) {
        const existing = await this.repository.findCreated(createKey);
        if (existing) {
          this.valid(existing);
          requireApi(existing.moderator.name === operation.name, 'REQUEST_ID_REUSED', 409);
          return this.project(existing, tokenHash);
        }
        const code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
        const room: Room = { schemaVersion: 1, code, revision: 0, createKey,
          createdAt: new Date(this.now()).toISOString(), expiresAt: new Date(this.now() + 86400000).toISOString(),
          moderator: { id: randomUUID(), name: operation.name, tokenHash }, members: [], game: null, receipts: {} };
        if (await this.repository.commit(room, -1)) return this.project(room, tokenHash);
      }
      throw new ApiError('STORAGE_BUSY', 503, true);
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const prior = await this.repository.read(operation.code); this.valid(prior);
      const room = structuredClone(prior);
      const receiptKey = hash(JSON.stringify([tokenHash, operation.requestId]));
      const fingerprint = hash(JSON.stringify(operation));
      if (room.receipts[receiptKey]) {
        requireApi(room.receipts[receiptKey] === fingerprint, 'REQUEST_ID_REUSED', 409);
        return this.project(room, tokenHash);
      }
      if (operation.type === 'join') {
        const existing = room.members.find(m => m.tokenHash === tokenHash);
        if (existing) return this.project(room, tokenHash);
        requireApi(room.moderator.tokenHash !== tokenHash, 'MODERATOR_CANNOT_JOIN', 409);
        requireApi(!room.game, 'ROOM_ALREADY_STARTED', 409);
        requireApi(room.members.length < 30, 'ROOM_FULL', 409);
        requireApi(!room.members.some(m => m.name.toLocaleLowerCase('vi') === operation.name.toLocaleLowerCase('vi')), 'DUPLICATE_NAME', 409);
        room.members.push({ id: randomUUID(), name: operation.name, tokenHash });
      } else {
        const identity = this.member(room, tokenHash);
        if (operation.type === 'command') {
          requireApi(room.game, 'GAME_NOT_STARTED', 409);
          try { room.game = dispatch(room.game, identity.moderator ? { kind: 'moderator' } : { kind: 'player', playerId: identity.member.id },
            { id: operation.requestId, gameId: room.game.id, stepId: operation.stepId, command: operation.command }); }
          catch (e) { if (e instanceof RuleError) throw new ApiError(e.code, ['MODERATOR_REQUIRED', 'PLAYER_REQUIRED', 'FORBIDDEN', 'NOT_YOUR_TURN'].includes(e.code) ? 403 : 409); throw e; }
        } else {
          requireApi(identity.moderator, 'MODERATOR_REQUIRED', 403);
          requireApi(!room.game, 'ROOM_ALREADY_STARTED', 409);
          requireApi(operation.expectedRevision === room.revision, 'STALE_ROOM', 409);
          if (operation.type === 'reorder') {
            requireApi(operation.playerIds.length === room.members.length && new Set(operation.playerIds).size === room.members.length &&
              operation.playerIds.every(id => room.members.some(m => m.id === id)), 'INVALID_SEATS');
            room.members = operation.playerIds.map(id => room.members.find(m => m.id === id)!);
          } else {
            requireApi(operation.roles.length === room.members.length, 'DECK_SIZE_MISMATCH');
            const roles = [...operation.roles];
            for (let i = roles.length - 1; i > 0; i--) { const j = randomInt(i + 1); [roles[i], roles[j]] = [roles[j], roles[i]]; }
            try { room.game = createGame(randomUUID(), room.members.map((m, i) => ({ id: m.id, name: m.name, role: roles[i] }))); }
            catch (e) { if (e instanceof RuleError) throw new ApiError(e.code, 409); throw e; }
          }
        }
      }
      room.receipts[receiptKey] = fingerprint; room.revision++;
      requireApi(Buffer.byteLength(JSON.stringify(room)) < 2_000_000, 'ROOM_TOO_LARGE', 413);
      if (await this.repository.commit(room, prior.revision)) return this.project(room, tokenHash);
    }
    throw new ApiError('STORAGE_BUSY', 503, true);
  }
}
