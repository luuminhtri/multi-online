import { isExtraStep } from '../engine/extensions.ts';
import { randomId } from '../shared/random-id.ts';
import { actors, createGame, dispatch, stepId, withdrawPlayer } from '../engine/engine.ts';
import { moderatorView, playerView } from '../engine/views.ts';
import { ROLES } from '../engine/rules.ts';
import { ROLE_DESCRIPTIONS } from '../catalog/descriptions.ts';
import type { Action, Command, Game, Role } from '../engine/types.ts';
import type { Mutation, Room, Snapshot } from '../server/types.ts';

type Store = Pick<Storage, 'getItem' | 'setItem'>;
export type LocalMutation = Mutation
  | { type: 'localStart'; code: string; requestId: string; expectedRevision: number; roles: Role[]; settings?: Parameters<typeof createGame>[2]; simplified: boolean }
  | { type: 'simpleAct'; code: string; requestId: string; stepId: string; action: Action }
  | { type: 'simpleAck'; code: string; requestId: string; stepId: string };
interface SavedTable { version: 1; room: Room; simplified: boolean; inspection: number | null; }
const prefix = 'ma-soi:local-table:v1:';
const ensure = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
export const localCatalog = () => (Object.keys(ROLES) as Role[]).map(id => ({ id, ...ROLES[id], description: ROLE_DESCRIPTIONS[id], image: `/offline-cards/${id}.png` }));

// This document never travels to a server. The current device is the moderator.
// Separate keys/version keep local saves independent from network room sessions.
export class LocalTable {
  private store: Store;
  private now: () => number;
  constructor(store: Store, now = () => Date.now()) { this.store = store; this.now = now; }
  lastCode() { return this.store.getItem('ma-soi:last-local') ?? ''; }
  private load(code: string): SavedTable {
    const value = this.store.getItem(prefix + code);
    ensure(value, 'Không tìm thấy bàn chơi đã lưu trên máy này.');
    const saved = JSON.parse(value!) as SavedTable;
    ensure(saved.version === 1 && saved.room.code === code, 'Bản lưu trên máy không tương thích.');
    return saved;
  }
  private save(saved: SavedTable) {
    // Commit only after every engine command succeeds. A failed save leaves the
    // previous state intact and does not display an unpersisted success.
    this.store.setItem(prefix + saved.room.code, JSON.stringify(saved));
    try { this.store.setItem('ma-soi:last-local', saved.room.code); } catch { /* save itself already succeeded */ }
  }
  read(code: string, proxy?: string | null): Snapshot { return this.project(this.load(code), proxy); }
  private project(saved: SavedTable, proxy?: string | null): Snapshot {
    const r = saved.room, g = r.game;
    if (proxy) ensure(r.members.some(m => m.id === proxy && !m.left), 'Người chơi đã rời bàn.');
    const deck = (g ? g.players.map(p => p.role) : r.lobbyRoles ?? []).reduce<Record<string, number>>((acc, role) => { acc[role] = (acc[role] ?? 0) + 1; return acc; }, {});
    const base = {
      room: { local: true, simplified: saved.simplified, inspection: saved.inspection, debug: false, code: r.code, revision: proxy ? null : r.revision,
        phase: !g ? 'lobby' as const : g.step === 'ended' ? 'ended' as const : r.gameStarted ? 'playing' as const : 'ready' as const,
        readyPlayerIds: r.readyPlayerIds ?? [], expiresAt: r.expiresAt, members: r.members.map((m, i) => ({ id: m.id, name: m.name, seat: i + 1, offline: true, left: !!m.left })) },
      me: { id: proxy ?? r.moderator.id, name: proxy ? r.members.find(m => m.id === proxy)!.name : r.moderator.name },
      storage: 'local' as const, catalog: localCatalog(), deck,
      ...(proxy ? { controller: 'moderator' as const, viewer: 'player' as const, game: g ? playerView(g, proxy) : null }
        : { viewer: 'moderator' as const, game: g ? moderatorView(g) : null }),
    };
    return { ...base, viewVersion: `${r.code}:${r.revision}:${proxy ?? 'host'}`, serverTime: new Date(this.now()).toISOString() } as Snapshot;
  }
  private command(g: Game, command: Command, actor?: string): Game {
    return dispatch(g, actor ? { kind: 'player', playerId: actor, proxy:true } : { kind: 'moderator' },
      { id: randomId(), gameId: g.id, stepId: stepId(g), command }, this.now());
  }
  private settle(g: Game): Game {
    // Skip only roles with no eligible actors, never unanswered active roles.
    for (let i = 0; i < 30 && !['review', 'day', 'ended'].includes(g.step) && actors(g).length === 0; i++) g = this.command(g, { type: 'advance' });
    if (g.step === 'review' && !g.resolved) g = this.command(g, { type: 'resolve' });
    return g;
  }
  mutate(operation: LocalMutation, proxy?: string | null): Snapshot {
    if (operation.type === 'create') {
      const previousCode = this.lastCode();
      if (previousCode) { try { const previous = this.load(previousCode); if (previous.room.createKey === operation.requestId) return this.project(previous); } catch { /* A damaged old save must not prevent a fresh table. */ } }
      let code: string;
      do {
        let value: number;
        // Rejection sampling keeps all six-digit strings equally likely.
        do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= 4_294_000_000);
        code = String(value % 1_000_000).padStart(6, '0');
      } while (this.store.getItem(prefix + code));
      const saved: SavedTable = { version: 1, simplified: true, inspection: null,
        room: { schemaVersion: 4, code, revision: 0, createKey: operation.requestId, lobbyRoles: [], readyPlayerIds: [], gameStarted: false,
          createdAt: new Date(this.now()).toISOString(), expiresAt: '2099-12-31T00:00:00.000Z', moderator: { id: randomId(), name: operation.name.trim() || 'Quản trò', tokenHash: '' }, members: [], game: null, receipts: {} } };
      this.save(saved); return this.project(saved);
    }
    const saved = structuredClone(this.load(operation.code)), r = saved.room;
    const fingerprint = JSON.stringify(operation);
    if (r.receipts[operation.requestId]) { ensure(r.receipts[operation.requestId] === fingerprint, 'Mã thao tác đã được dùng.'); return this.project(saved, proxy); }
    if ('expectedRevision' in operation) ensure(operation.expectedRevision === r.revision, 'Bàn chơi vừa thay đổi. Hãy làm mới.');
    if (operation.type === 'simpleAct' || operation.type === 'simpleAck') {
      ensure(saved.simplified && r.gameStarted && r.game && operation.stepId === stepId(r.game), 'Lượt đã thay đổi. Hãy làm mới.');
      let g = r.game!;
      if (operation.type === 'simpleAck') {
        ensure(saved.inspection !== null, 'Không có kết quả đang chờ xác nhận.'); saved.inspection = null;
        if (actors(g).every(id=>Object.hasOwn(g.actions,id))) g = this.command(g, { type: 'advance' });
      } else {
        ensure(saved.inspection === null, 'Hãy xác nhận kết quả soi trước.');
        let ids = actors(g); if (g.step !== 'wolves') ids = ids.filter(id => !Object.hasOwn(g.actions, id)).slice(0, 1); ensure(ids.length > 0, 'Không có vai đang hành động.');
        if (operation.action.type === 'sacrifice') ids = [...ids].sort((a, b) => Number(b === (operation.action as { target: string }).target) - Number(a === (operation.action as { target: string }).target));
        for (const id of ids) {
          g = this.command(g, { type: 'wake' }, id);
          g = this.command(g, { type: 'act', action: operation.action }, id);
        }
        const result=[...g.events].reverse().find(e=>e.id>(saved.room.game!.events.at(-1)?.id??0)&&['inspection','aura-inspection','mystic-inspection','alignment-comparison','ability-result'].includes(e.type));
        if(result) saved.inspection=result.id;
        else if (actors(g).every(id => Object.hasOwn(g.actions, id))) g = this.command(g, { type: 'advance' });
      }
      r.game = saved.inspection === null ? this.settle(g) : g;
    } else if (operation.type === 'addOffline') {
      ensure(!r.game && r.members.length < 30, 'Chỉ thêm người trước khi chia vai, tối đa 30 người.');
      const name = operation.name.normalize('NFC').replace(/\s+/gu, ' ').trim();
      ensure(name.length > 0 && name.length <= 40, 'Nhập tên từ 1 đến 40 ký tự.');
      ensure(![r.moderator, ...r.members].some(m => m.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')), 'Tên này đã có trong bàn.');
      r.members.push({ id: randomId(), name, tokenHash: '', offline: true });
    } else if (operation.type === 'setDeck') { ensure(!r.game, 'Bàn đã chia vai.'); ensure(operation.roles.length <= 30 && operation.roles.every(id => Object.hasOwn(ROLES, id)), 'Bộ vai không hợp lệ.'); r.lobbyRoles = [...operation.roles];
    } else if (operation.type === 'reorder') {
      ensure(!r.game && operation.playerIds.length === r.members.length && new Set(operation.playerIds).size === r.members.length && operation.playerIds.every(id => r.members.some(m => m.id === id)), 'Thứ tự ghế không hợp lệ.');
      r.members = operation.playerIds.map(id => r.members.find(m => m.id === id)!);
    } else if (operation.type === 'start' || operation.type === 'localStart') {
      ensure(!r.game && operation.roles.length === r.members.length, 'Số thẻ phải bằng số người chơi.');
      const roles = [...operation.roles];
      for (let i = roles.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [roles[i], roles[j]] = [roles[j], roles[i]]; }
      r.game = createGame(randomId(), r.members.map((m, i) => ({ id: m.id, name: m.name, role: roles[i] })), operation.settings);
      r.lobbyRoles = [...operation.roles]; r.readyPlayerIds = r.members.map(m => m.id); r.gameStarted = false;
      if (operation.type === 'localStart') saved.simplified = operation.simplified;
    } else if (operation.type === 'begin') {
      ensure(r.game && !r.gameStarted, 'Bàn chưa chia vai hoặc đã bắt đầu.'); r.gameStarted = true;
      if (saved.simplified) r.game = this.settle(r.game!);
    } else if (operation.type === 'offlineReady') { ensure(!r.gameStarted && r.members.some(m => m.id === operation.playerId && !m.left), 'Không thể xem vai người này.');
    } else if (operation.type === 'removeMember') {
      const m = r.members.find(m => m.id === operation.playerId); ensure(m && !m.left, 'Không tìm thấy người chơi.');
      if (!r.game) r.members = r.members.filter(m => m.id !== operation.playerId);
      else { m!.left = true; r.game = withdrawPlayer(r.game, operation.playerId); if (saved.simplified && saved.inspection === null) r.game = this.settle(r.game); }
    } else if (operation.type === 'setOffline') { ensure(r.members.some(m => m.id === operation.playerId && !m.left), 'Không tìm thấy người chơi.');
    } else if (operation.type === 'command' || operation.type === 'offlineCommand') {
      ensure(r.game && r.gameStarted && operation.stepId === stepId(r.game), 'Lượt đã thay đổi hoặc ván chưa bắt đầu.');
      if (operation.type === 'offlineCommand') ensure(!saved.simplified && r.members.some(m => m.id === operation.playerId && !m.left), 'Hãy nhập trực tiếp trên màn quản trò.');
      ensure(saved.inspection === null, 'Hãy xác nhận kết quả soi trước.');
      r.game = this.command(r.game!, operation.command, operation.type === 'offlineCommand' ? operation.playerId : undefined);
      if (saved.simplified) r.game = this.settle(r.game);
    } else throw new Error('Thao tác không có trong chế độ một máy.');
    r.revision++; r.receipts[operation.requestId] = fingerprint;
    this.save(saved);
    return this.project(saved, operation.type === 'offlineReady' || operation.type === 'offlineCommand' ? operation.playerId : proxy);
  }
}
