import type { GameEvent } from '../engine/types.ts';

// Chỉ đánh dấu kết quả đêm đã công bố; không dùng pendingDeaths/nhật ký bí mật.
export function latestNightDeaths(events: readonly GameEvent[]): string[] {
  const morning = [...events].reverse().find(e => e.audience === 'public' && e.type === 'morning');
  return Array.isArray(morning?.data.dead) ? morning.data.dead.filter((id): id is string => typeof id === 'string') : [];
}

// Các công bố dùng cùng nhãn ở quản trò và người chơi.
export function publicEventText(e: GameEvent, name: (id: unknown) => string): string | null {
  const dead = Array.isArray(e.data.dead) ? e.data.dead : [];
  switch (e.type) {
    case 'morning': return `Đêm ${e.night}: ${dead.length ? `${dead.map(name).join(', ')} đã chết.` : 'Không có ai chết.'}`;
    case 'deaths': return `Sáng ${e.night}: ${dead.length ? `${dead.map(name).join(', ')} đã chết.` : 'Không có ai chết.'}`;
    case 'verdict': return `Sáng ${e.night}: ${e.data.target ? `${name(e.data.target)} bị vote chết.` : 'Không có ai chết.'}`;
    case 'prince-revealed': return `Sáng ${e.night}: ${name(e.data.player)} là Hoàng tử và không bị treo cổ.`;
    default: return null;
  }
}
