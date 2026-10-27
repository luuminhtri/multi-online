import type { Action, Command, DayTimers, Role } from '../engine/types.ts';
import { ROLES } from '../engine/rules.ts';
import type { Mutation } from './types.ts';
export class ApiError extends Error {
  code: string; status: number; retryable: boolean;
  constructor(code: string, status = 400, retryable = false) { super(code); this.code = code; this.status = status; this.retryable = retryable; }
}
export function requireApi(ok: unknown, code: string, status = 400): asserts ok { if (!ok) throw new ApiError(code, status); }
function object(v: unknown): Record<string, unknown> {
  requireApi(v !== null && typeof v === 'object' && !Array.isArray(v), 'INVALID_REQUEST');
  return v as Record<string, unknown>;
}
function keys(v: Record<string, unknown>, expected: string[]) { requireApi(Object.keys(v).every(k => expected.includes(k)), 'UNKNOWN_FIELD'); }
function text(v: unknown, max = 128): string { requireApi(typeof v === 'string' && v.length > 0 && v.length <= max, 'INVALID_REQUEST'); return v; }
function list(v: unknown, max = 30): string[] { requireApi(Array.isArray(v) && v.length <= max, 'INVALID_REQUEST'); return v.map(x => text(x, 80)); }
export function roomCode(v: unknown): string { const code = text(v, 6).toUpperCase(); requireApi(/^(?:[0-9]{6}|[A-Z2-9]{6})$/.test(code), 'INVALID_ROOM_CODE'); return code; }
export function cleanName(v: unknown): string { const name = text(v, 80).normalize('NFC').replace(/\s+/gu, ' ').trim(); requireApi(name.length > 0 && name.length <= 40 && !/[\u0000-\u001f\u007f]/u.test(name), 'INVALID_NAME'); return name; }
export function token(v: unknown): string { requireApi(typeof v === 'string' && /^Bearer [a-f0-9]{64}$/.test(v), 'SESSION_REQUIRED', 401); return v.slice(7); }
function action(v: unknown): Action {
  const a = object(v);
  switch (a.type) {
    case 'ability': {
      keys(a,['type','targets','pass','text','choice']);
      requireApi(a.pass===undefined||typeof a.pass==='boolean','INVALID_ACTION');
      return {type:'ability', targets:list(a.targets,30), ...(a.pass!==undefined?{pass:a.pass as boolean}:{}), ...(a.text!==undefined?{text:text(a.text,80)}:{}), ...(a.choice!==undefined?{choice:text(a.choice,80)}:{})};
    }
    case 'hold': keys(a, ['type']); return { type: 'hold' };
    case 'fast': keys(a, ['type']); return { type: 'fast' };
    case 'convert': keys(a, ['type', 'target']); return { type: 'convert', target: a.target === null ? null : text(a.target, 80) };
    case 'protect': case 'inspect': case 'bite': case 'shoot': case 'mimic': case 'bond': case 'sacrifice':
      keys(a, ['type', 'target']); return { type: a.type, target: text(a.target, 80) };
    case 'maul': keys(a, ['type', 'targets']); return { type: 'maul', targets: list(a.targets, 2) };
    case 'pair': case 'compare': {
      keys(a, ['type', 'targets']); const targets = list(a.targets, 2); requireApi(targets.length === 2, 'INVALID_REQUEST');
      return { type: a.type, targets: [targets[0], targets[1]] };
    }
    case 'potion':
      keys(a, ['type', 'heal', 'healTarget', 'poison']); requireApi(typeof a.heal === 'boolean', 'INVALID_REQUEST');
      return { type: 'potion', heal: a.heal, poison: a.poison === null ? null : text(a.poison, 80), ...(a.healTarget !== undefined ? { healTarget: text(a.healTarget, 80) } : {}) };
    default: throw new ApiError('INVALID_ACTION');
  }
}
function command(v: unknown): Command {
  const c = object(v);
  switch (c.type) {
    case 'wolfTimeout': case 'wake': case 'advance': case 'resolve': case 'publish': case 'nextNight': keys(c, ['type']); return { type: c.type };
    case 'reviewNote': keys(c,['type','actor','approve']);requireApi(typeof c.approve==='boolean','INVALID_REQUEST');return {type:'reviewNote',actor:text(c.actor,80),approve:c.approve};
    case 'penalty': keys(c,['type','target']);return {type:'penalty',target:text(c.target,80)};
    case 'verdict': keys(c, ['type', 'target']); return { type: 'verdict', target: c.target === null ? null : text(c.target, 80) };
    case 'act': keys(c, ['type', 'action']); return { type: 'act', action: action(c.action) };
    case 'chat': keys(c, ['type', 'text']); return { type: 'chat', text: text(c.text, 200) };
    case 'dayPhase': keys(c, ['type', 'action']); requireApi(c.action === 'start' || c.action === 'next', 'INVALID_REQUEST'); return { type: 'dayPhase', action: c.action };
    default: throw new ApiError('INVALID_COMMAND');
  }
}
export function parseMutation(v: unknown): Mutation {
  const o = object(v), requestId = text(o.requestId);
  requireApi(/^[A-Za-z0-9_-]{1,128}$/.test(requestId), 'INVALID_REQUEST');
  if (o.type === 'create') { keys(o, ['type', 'requestId', 'name']); return { type: 'create', requestId, name: cleanName(o.name) }; }
  const code = roomCode(o.code);
  if (o.type === 'join') { keys(o, ['type', 'requestId', 'code', 'name']); return { type: 'join', requestId, code, name: cleanName(o.name) }; }
  if (o.type === 'offlineReady') { keys(o, ['type', 'requestId', 'code', 'playerId']); return { type: 'offlineReady', requestId, code, playerId: text(o.playerId, 80) }; }
  if (o.type === 'offlineCommand') { keys(o, ['type', 'requestId', 'code', 'playerId', 'stepId', 'command']); return { type: 'offlineCommand', requestId, code, playerId: text(o.playerId, 80), stepId: text(o.stepId, 200), command: command(o.command) }; }
  if (o.type === 'leave') { keys(o, ['type', 'requestId', 'code']); return { type: 'leave', requestId, code }; }
  if (o.type === 'ready') { keys(o, ['type', 'requestId', 'code']); return { type: 'ready', requestId, code }; }
  if (o.type === 'command') { keys(o, ['type', 'requestId', 'code', 'stepId', 'command']); return { type: 'command', requestId, code, stepId: text(o.stepId, 200), command: command(o.command) }; }
  requireApi(Number.isSafeInteger(o.expectedRevision) && (o.expectedRevision as number) >= 0, 'INVALID_REVISION');
  const expectedRevision = o.expectedRevision as number;
  if (o.type === 'setOffline' || o.type === 'removeMember') { keys(o, ['type', 'requestId', 'code', 'expectedRevision', 'playerId']); return { type: o.type, requestId, code, expectedRevision, playerId: text(o.playerId, 80) }; }
  if (o.type === 'addOffline') { keys(o, ['type', 'requestId', 'code', 'expectedRevision', 'name']); return { type: 'addOffline', requestId, code, expectedRevision, name: cleanName(o.name) }; }
  if (o.type === 'begin') { keys(o, ['type', 'requestId', 'code', 'expectedRevision']); return { type: 'begin', requestId, code, expectedRevision }; }
  if (o.type === 'reorder') {
    keys(o, ['type', 'requestId', 'code', 'expectedRevision', 'playerIds']);
    return { type: 'reorder', requestId, code, expectedRevision, playerIds: list(o.playerIds) };
  }
  if (o.type === 'setDeck') {
    keys(o, ['type', 'requestId', 'code', 'expectedRevision', 'roles']); const roles = list(o.roles);
    requireApi(roles.every(r => Object.hasOwn(ROLES, r)), 'UNSUPPORTED_ROLE');
    return { type: 'setDeck', requestId, code, expectedRevision, roles: roles as Role[] };
  }
  if (o.type === 'start') {
    keys(o, ['type', 'requestId', 'code', 'expectedRevision', 'roles', 'settings']); const roles = list(o.roles);
    requireApi(roles.every(r => Object.hasOwn(ROLES, r)), 'UNSUPPORTED_ROLE');
    let settings;
    if (o.settings !== undefined) {
      const s = object(o.settings); keys(s, ['witchSeesBite', 'dayTimers', 'skipVoteDays', 'hunterActiveShot']);
      requireApi(typeof s.witchSeesBite === 'boolean', 'INVALID_SETTINGS');
      requireApi(s.hunterActiveShot === undefined || typeof s.hunterActiveShot === 'boolean', 'INVALID_SETTINGS');
      let skipVoteDays;
      if (s.skipVoteDays !== undefined) {
        requireApi(typeof s.skipVoteDays === 'number' && Number.isSafeInteger(s.skipVoteDays) && s.skipVoteDays >= 0 && s.skipVoteDays <= 30, 'INVALID_SETTINGS');
        skipVoteDays = s.skipVoteDays;
      }
      let dayTimers;
      if (s.dayTimers !== undefined) {
        const t = object(s.dayTimers); keys(t, ['discussion', 'nomination', 'defense', 'finalvote']);
        const values = Object.values(t);
        requireApi(values.length === 4 && values.every(v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 5 && v <= 3600), 'INVALID_SETTINGS');
        const pick = (k: string) => t[k] as number;
        dayTimers = { discussion: pick('discussion'), nomination: pick('nomination'), defense: pick('defense'), finalvote: pick('finalvote') } as DayTimers;
      }
      settings = { witchSeesBite: s.witchSeesBite, ...(s.hunterActiveShot !== undefined ? { hunterActiveShot: s.hunterActiveShot as boolean } : {}), ...(dayTimers ? { dayTimers } : {}), ...(skipVoteDays !== undefined ? { skipVoteDays } : {}) };
    }
    return { type: 'start', requestId, code, expectedRevision, roles: roles as Role[], ...(settings ? { settings } : {}) };
  }
  throw new ApiError('INVALID_REQUEST');
}
