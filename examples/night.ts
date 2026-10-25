import { createGame, dispatch, stepId } from '../src/engine/engine.ts';
import { publicView, playerView } from '../src/engine/views.ts';
import type { Action, Command, Principal } from '../src/engine/types.ts';

let game = createGame('demo', [
  { id: 'p01', name: 'Minh', role: 'wolf' },
  { id: 'p02', name: 'Lan', role: 'guard' },
  { id: 'p03', name: 'Hà', role: 'seer' },
  { id: 'p04', name: 'Hương', role: 'witch' },
  { id: 'an', name: 'An', role: 'villager' },
  { id: 'binh', name: 'Bình', role: 'villager' },
]);
function send(command: Command, principal: Principal = { kind: 'moderator' }) {
  game = dispatch(game, principal, { id: `demo-${game.revision}`, gameId: game.id, stepId: stepId(game), command });
}
function act(id: string, action: Action) {
  const principal: Principal = { kind: 'player', playerId: id };
  send({ type: 'wake' }, principal); send({ type: 'act', action }, principal); send({ type: 'advance' });
}
act('p02', { type: 'protect', target: 'an' });
act('p03', { type: 'inspect', target: 'p01' });
act('p01', { type: 'bite', target: 'an' });
act('p04', { type: 'potion', heal: false, poison: 'an' });
send({ type: 'resolve' });
console.log('\nQUẢN TRÒ: Sói cắn An; Bảo vệ bảo vệ An; Phù thủy đầu độc An.');
console.table(game.events.filter(e => ['bite-blocked', 'death'].includes(e.type)).map(e => ({ event: e.type, detail: JSON.stringify(e.data) })));
console.log('Tiên tri nhận riêng:', playerView(game, 'p03').messages);
console.log('Trước công bố, làng vẫn thấy An sống:', publicView(game).players.find(p => p.id === 'an')!.alive);
send({ type: 'publish' });
console.log('\nSAU CÔNG BỐ — DỮ LIỆU CẢ LÀNG NHẬN:');
console.log(JSON.stringify(publicView(game), null, 2));
