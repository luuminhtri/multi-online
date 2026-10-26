// Target selection stays local until the explicit Confirm action sends it.
export interface TargetSlot { id: string; targets: string[]; optional: boolean; }
export function pickTarget(slots: TargetSlot[], values: Record<string, string>, slotId: string, target: string, distinct: boolean) {
  const slot = slots.find(s => s.id === slotId);
  if (!slot || target !== '' && !slot.targets.includes(target) || target === '' && !slot.optional) return null;
  const next = { ...values, [slotId]: target };
  if (distinct && target) for (const s of slots) if (s.id !== slotId && next[s.id] === target) next[s.id] = '';
  return next;
}

export function visiblePackIds(view: { turn: { ability: string; awake: boolean } | null; pack: { id: string; alive: boolean }[] | null } | null, moderatorActing = false): string[] {
  if (view?.turn?.ability !== 'wolves' || !view.turn.awake && !moderatorActing) return [];
  return view.pack?.filter(p => p.alive).map(p => p.id) ?? [];
}
