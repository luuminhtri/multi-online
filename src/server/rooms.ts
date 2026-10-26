import { createHash, randomInt, randomUUID } from 'node:crypto';
import { createGame, dispatch, withdrawPlayer, RuleError } from '../engine/engine.ts';
import { moderatorView, playerView } from '../engine/views.ts';
import { ROLES, RULES } from '../engine/rules.ts';
import { legacyWitchRules } from '../engine/witch.ts';
import { ROLE_DESCRIPTIONS } from '../catalog/descriptions.ts';
import { ROLE_IMAGES } from '../catalog/images.ts';
import type { Role } from '../engine/types.ts';
import type { Member, Mutation, Room, RoomRepository, Snapshot } from './types.ts';
import { ApiError, requireApi } from './validation.ts';

const hash = (v: string) => createHash('sha256').update(v).digest('hex');
const alphabet = '0123456789';
export const supportedCatalog = () => (Object.keys(ROLES) as Role[]).map(id => ({ id, ...ROLES[id], description: ROLE_DESCRIPTIONS[id], image: ROLE_IMAGES[id] ?? null }));
export class RoomService {
  readonly repository: RoomRepository; private now: () => number;
  private debug: boolean;
  private exitDelay: number; private lease: number;
  private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(repository: RoomRepository, now = () => Date.now(), options: { debug?: boolean; debugExitDelayMs?: number; debugLeaseMs?: number } = {}) {
    this.repository = repository; this.now = now; this.debug = !!options.debug;
    if (this.debug && !repository.remove) throw new Error('Debug requires an ephemeral removable repository');
    this.exitDelay = options.debugExitDelayMs ?? 2000; this.lease = options.debugLeaseMs ?? 90000;
  }
  dispose() { for (const timer of this.expiryTimers.values()) clearTimeout(timer); this.expiryTimers.clear(); }
  private debugExpiry(code: string, delay: number) {
    clearTimeout(this.expiryTimers.get(code));
    const timer = setTimeout(async () => {
      try {
        const room = await this.repository.read(code);
        if (room && this.expiryTimers.get(code) === timer) {
          const removed = await this.repository.remove!(code, room.revision);
          // A guest action may race expiry. Retry without overriding a returning host's lease.
          if (!removed && this.expiryTimers.get(code) === timer) this.debugExpiry(code, 50);
        }
      } finally { if (this.expiryTimers.get(code) === timer) this.expiryTimers.delete(code); }
    }, delay);
    timer.unref(); this.expiryTimers.set(code, timer);
  }
  async closeDebug(code: string, token: string) {
    requireApi(this.debug && this.repository.remove, 'DEBUG_UNAVAILABLE', 404);
    const room = await this.repository.read(code); this.valid(room);
    requireApi(this.member(room, hash(token)).moderator, 'MODERATOR_REQUIRED', 403);
    this.debugExpiry(code, this.exitDelay); return { closing: true };
  }
  private offlineMember(room: Room, id: string): Member {
    const target = room.members.find(m => m.id === id);
    requireApi(target?.offline && !target.left, 'OFFLINE_PLAYER_REQUIRED', 403); return target;
  }
  private valid(room: Room | null): asserts room is Room {
    requireApi(room && Date.parse(room.expiresAt) > this.now(), 'ROOM_NOT_FOUND', 404);
    requireApi([1, 2, 3, 4].includes(room.schemaVersion), 'ROOM_VERSION_UNSUPPORTED', 409);
    requireApi(room.schemaVersion === 1 || Array.isArray(room.lobbyRoles) && room.lobbyRoles.length <= 30 && room.lobbyRoles.every(r => Object.hasOwn(ROLES, r)), 'ROOM_VERSION_UNSUPPORTED', 409);
    // v8/schema3, v9/schema4 and v10/schema5 are readable legacy shapes; only
    // v11/schema6 games support day phase clocks (chat needs v10/schema5).
    const game = room.game;
    const legacy = !!game && ((game.rulesVersion === 'classic-core-v9' && game.schemaVersion === 4) ||
      (game.rulesVersion === 'classic-core-v10' && game.schemaVersion === 5) ||
      (game.rulesVersion === 'classic-core-v11' && game.schemaVersion === 6) || (game.rulesVersion === 'classic-core-v12' && game.schemaVersion === 7));
    const current = !!game && game.rulesVersion === RULES.version && game.schemaVersion === 8;
    requireApi(!game || legacyWitchRules(game) ||
      (legacy && typeof game.settings?.witchSeesBite === 'boolean') || current, 'GAME_VERSION_UNSUPPORTED', 409);
  }
  private member(room: Room, tokenHash: string): { member: Member; moderator: boolean } {
    if (room.moderator.tokenHash === tokenHash) return { member: room.moderator, moderator: true };
    const member = room.members.find(m => m.tokenHash === tokenHash);
    requireApi(member, 'SESSION_NOT_IN_ROOM', 403); requireApi(!member.left, 'PLAYER_LEFT', 403); return { member, moderator: false };
  }
  project(room: Room, tokenHash: string, offlinePlayerId?: string): Snapshot {
    this.valid(room); const actor = this.member(room, tokenHash);
    if (offlinePlayerId) requireApi(actor.moderator, 'MODERATOR_REQUIRED', 403);
    const identity = offlinePlayerId ? { member: this.offlineMember(room, offlinePlayerId), moderator: false } : actor;
    if (this.debug && actor.moderator) this.debugExpiry(room.code, this.lease);
    // Deck composition is public: which roles are in play and how many, never
    // who holds which. Players see the same counts as the moderator.
    const roles = room.game ? room.game.players.map(p => p.role) : room.lobbyRoles ?? [];
    const deck = roles.reduce<Record<string, number>>((acc, role) => { acc[role] = (acc[role] ?? 0) + 1; return acc; }, {});
    const started = room.gameStarted ?? !!room.game;
    const payload = {
      ...(offlinePlayerId ? { controller: 'moderator' as const } : {}),
      room: { debug: this.debug, code: room.code, revision: identity.moderator || !room.game ? room.revision : null,
        readyPlayerIds: [...(room.readyPlayerIds ?? [])],
        phase: !room.game ? 'lobby' as const : room.game.step === 'ended' ? 'ended' as const : !started ? 'ready' as const : 'playing' as const,
        expiresAt: room.expiresAt, members: room.members.map((m, i) => ({ id: m.id, name: m.name, seat: i + 1, offline: !!m.offline, left: !!m.left })) },
      me: { id: identity.member.id, name: identity.member.name },
      storage: this.repository.mode, catalog: supportedCatalog(), deck,
      ...(identity.moderator ? { viewer: 'moderator' as const, game: room.game ? moderatorView(room.game) : null }
        : { viewer: 'player' as const, game: room.game ? { ...playerView(room.game, identity.member.id), ...(!started ? { turn: null } : {}) } : null }),
    };
    return { ...payload, viewVersion: hash(JSON.stringify(payload)), serverTime: new Date(this.now()).toISOString() } as Snapshot;
  }
  async read(code: string, token: string, offlinePlayerId?: string) { const room = await this.repository.read(code); this.valid(room); return this.project(room, hash(token), offlinePlayerId); }
  async mutate(operation: Mutation, token: string): Promise<Snapshot> {
    const tokenHash = hash(token);
    const proxyId = operation.type === 'offlineReady' || operation.type === 'offlineCommand' ? operation.playerId : undefined;
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
        const room: Room = { schemaVersion: 4, lobbyRoles: [], readyPlayerIds: [], gameStarted: false, code, revision: 0, createKey,
          createdAt: new Date(this.now()).toISOString(), expiresAt: new Date(this.now() + 86400000).toISOString(),
          moderator: { id: randomUUID(), name: operation.name, tokenHash }, members: [], game: null, receipts: {} };
        if (await this.repository.commit(room, -1)) return this.project(room, tokenHash);
      }
      throw new ApiError('STORAGE_BUSY', 503, true);
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const prior = await this.repository.read(operation.code); this.valid(prior);
      const room = structuredClone(prior);
      // Migration on first successful write; old games retain their own rules/schema.
      room.schemaVersion = 4; room.lobbyRoles ??= []; room.readyPlayerIds ??= []; room.gameStarted ??= !!room.game;
      const receiptKey = hash(JSON.stringify([tokenHash, operation.requestId]));
      const fingerprint = hash(JSON.stringify(operation));
      if (room.receipts[receiptKey]) {
        requireApi(room.receipts[receiptKey] === fingerprint, 'REQUEST_ID_REUSED', 409);
        return this.project(room, tokenHash, proxyId);
      }
      if (operation.type === 'join') {
        const existing = room.members.find(m => m.tokenHash === tokenHash);
        if (existing) { requireApi(!existing.left, 'PLAYER_LEFT', 403); return this.project(room, tokenHash); }
        const sameName = (v: string) => v.normalize('NFC').toLocaleLowerCase('vi') === operation.name.normalize('NFC').toLocaleLowerCase('vi');
        if (room.moderator.tokenHash === tokenHash && sameName(room.moderator.name)) return this.project(room, tokenHash);
        requireApi(room.moderator.tokenHash !== tokenHash, 'MODERATOR_CANNOT_JOIN', 409);
        const priorMember = room.members.find(m => sameName(m.name));
        const priorModerator = sameName(room.moderator.name);
        requireApi(!(priorMember && priorModerator), 'AMBIGUOUS_NAME', 409);
        if (priorMember || priorModerator) {
          requireApi(!this.debug, 'DUPLICATE_NAME', 409);
          const recovered = priorMember ?? room.moderator;
          requireApi(!recovered.left, 'PLAYER_LEFT', 403);
          recovered.tokenHash = tokenHash;
          if (priorMember) priorMember.offline = false;
        } else {
          requireApi(!room.game, 'ROOM_ALREADY_STARTED', 409);
          requireApi(room.members.length < 30, 'ROOM_FULL', 409);
          room.members.push({ id: randomUUID(), name: operation.name, tokenHash, offline: false });
        }
      } else {
        const identity = this.member(room, tokenHash);
        if (operation.type === 'setOffline' || operation.type === 'removeMember') {
          requireApi(identity.moderator, 'MODERATOR_REQUIRED', 403);
          requireApi(operation.expectedRevision === room.revision, 'STALE_ROOM', 409);
          const selected = room.members.find(m => m.id === operation.playerId);
          requireApi(selected && !selected.left, 'PLAYER_NOT_FOUND', 404);
          if (operation.type === 'setOffline') {
            selected.offline = true;
            selected.tokenHash = hash(randomUUID() + randomUUID());
          } else if (!room.game) {
            room.members = room.members.filter(m => m.id !== selected.id);
          } else {
            selected.left = true;
            room.readyPlayerIds = room.readyPlayerIds.filter(id => id !== selected.id);
            room.game = withdrawPlayer(room.game, selected.id);
          }
        } else if (operation.type === 'ready' || operation.type === 'offlineReady') {
          if (operation.type === 'offlineReady') { requireApi(identity.moderator, 'MODERATOR_REQUIRED', 403); identity.member = this.offlineMember(room, operation.playerId); }
          else requireApi(!identity.moderator, 'PLAYER_REQUIRED', 403);
          requireApi(room.game && room.game.step !== 'ended' && !room.gameStarted, 'READY_UNAVAILABLE', 409);
          if (!room.readyPlayerIds.includes(identity.member.id)) room.readyPlayerIds.push(identity.member.id);
        } else if (operation.type === 'begin') {
          requireApi(identity.moderator, 'MODERATOR_REQUIRED', 403);
          requireApi(room.game && room.game.step !== 'ended' && !room.gameStarted, 'READY_UNAVAILABLE', 409);
          requireApi(operation.expectedRevision === room.revision, 'STALE_ROOM', 409);
          requireApi(room.members.filter(m => !m.left).length > 0 && room.members.filter(m => !m.left).every(m => room.readyPlayerIds!.includes(m.id)), 'PLAYERS_NOT_READY', 409);
          room.gameStarted = true;
        } else if (operation.type === 'command' || operation.type === 'offlineCommand') {
          requireApi(room.game, 'GAME_NOT_STARTED', 409);
          requireApi(room.gameStarted, 'GAME_AWAITING_READY', 409);
          if (operation.type === 'offlineCommand') { requireApi(identity.moderator, 'MODERATOR_REQUIRED', 403); identity.member = this.offlineMember(room, operation.playerId); identity.moderator = false; }
          try { room.game = dispatch(room.game, identity.moderator ? { kind: 'moderator' } : { kind: 'player', playerId: identity.member.id },
            { id: operation.requestId, gameId: room.game.id, stepId: operation.stepId, command: operation.command }, this.now()); }
          catch (e) { if (e instanceof RuleError) throw new ApiError(e.code, ['MODERATOR_REQUIRED', 'PLAYER_REQUIRED', 'FORBIDDEN', 'NOT_YOUR_TURN'].includes(e.code) ? 403 : 409); throw e; }
        } else {
          requireApi(identity.moderator, 'MODERATOR_REQUIRED', 403);
          requireApi(!room.game, 'ROOM_ALREADY_STARTED', 409);
          requireApi(operation.expectedRevision === room.revision, 'STALE_ROOM', 409);
          if (operation.type === 'addOffline') {
            requireApi(room.members.length < 30, 'ROOM_FULL', 409);
            const normalized = operation.name.normalize('NFC').toLocaleLowerCase('vi');
            requireApi(![room.moderator, ...room.members].some(m => m.name.normalize('NFC').toLocaleLowerCase('vi') === normalized), 'DUPLICATE_NAME', 409);
            room.members.push({ id: randomUUID(), name: operation.name, tokenHash: hash(randomUUID() + randomUUID()), offline: true });
          } else if (operation.type === 'setDeck') {
            requireApi(operation.roles.length <= 30 && operation.roles.every(r => Object.hasOwn(ROLES, r)), 'UNSUPPORTED_ROLE');
            room.lobbyRoles = [...operation.roles];
          } else if (operation.type === 'reorder') {
            requireApi(operation.playerIds.length === room.members.length && new Set(operation.playerIds).size === room.members.length &&
              operation.playerIds.every(id => room.members.some(m => m.id === id)), 'INVALID_SEATS');
            room.members = operation.playerIds.map(id => room.members.find(m => m.id === id)!);
          } else {
            requireApi(operation.roles.length === room.members.length, 'DECK_SIZE_MISMATCH');
            room.gameStarted = false; room.readyPlayerIds = [];
            room.lobbyRoles = [...operation.roles];
            const roles = [...operation.roles];
            for (let i = roles.length - 1; i > 0; i--) { const j = randomInt(i + 1); [roles[i], roles[j]] = [roles[j], roles[i]]; }
            try { room.game = createGame(randomUUID(), room.members.map((m, i) => ({ id: m.id, name: m.name, role: roles[i] })), operation.settings); }
            catch (e) { if (e instanceof RuleError) throw new ApiError(e.code, 409); throw e; }
          }
        }
      }
      room.receipts[receiptKey] = fingerprint; room.revision++;
      requireApi(Buffer.byteLength(JSON.stringify(room)) < 2_000_000, 'ROOM_TOO_LARGE', 413);
      if (await this.repository.commit(room, prior.revision)) return this.project(room, tokenHash, proxyId);
    }
    throw new ApiError('STORAGE_BUSY', 503, true);
  }
}
