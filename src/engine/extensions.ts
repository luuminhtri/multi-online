import { hasPower } from './power-policy.ts';
import { EXTRA_OPENING, EXTRA_NIGHT, type ExtraStep, type ExtraTurn, type ExtraState, type ExtraPlayer } from './extension-types.ts';
import { isWolf } from './role-policy.ts';
import type { Game, Action, Role } from './types.ts';
export interface ExtensionContext {
 check(ok: unknown, code: string): asserts ok;
 event(g: Game, type: string, data: Record<string, unknown>, recipient?: string): void;
 neighbors(g: Game, id: string): string[];
}
export const isExtended = (g: Game) => g.rulesVersion === 'classic-core-v14';
export const isModernHunter = (g: Game) => g.rulesVersion === 'classic-core-v13' || isExtended(g);
export function extraState(g: Game): ExtraState {
 return g.extra ??= {players:{},woke:[],everWoke:[],withdrawn:[],attacks:[],pending:[],day:{absent:[],silent:[],mummy:[],brainEaten:[]},verdictsRemaining:1,dayKills:0,wolfTimedOut:false,vampireVictims:[],notes:[]};
}
export function extraPlayer(g: Game, id: string): ExtraPlayer { const players=extraState(g).players;if(!Object.hasOwn(players,id))Object.defineProperty(players,id,{value:{},enumerable:true,writable:true,configurable:true});return players[id]; }
export const isExtraStep = (step: string): step is ExtraStep => [...EXTRA_OPENING,...EXTRA_NIGHT].includes(step as ExtraStep);
export function extraTargets(g: Game, id: string): string[] {
 const step=g.step;
 const s=g.extra?.players[id]??{};
 if(step==='bloody_mary'){if(s.killerId&&g.players.some(p=>p.id===s.killerId&&p.alive))return [s.killerId];return g.players.filter(p=>p.alive&&p.team===s.grudge).map(p=>p.id);}
 const occupied=step==='cult_leader'?s.cult:step==='zombie'?s.brainEaten:step==='dracula'?s.brides:undefined;
 const living=g.players.filter(t=>t.alive);
 if (['mason','minion','beholder','count','insomniac','drunk','troublemaker','nostradamus','blob','ghost'].includes(step)) return [];
 if(step==='leprechaun')return [...new Set(g.biteTargets.flatMap(t=>[t,...livingAdjacent(g,t)]))];
 if (step==='the_thing') {
  const index=g.players.findIndex(t=>t.id===id), n=g.players.length;
  return [...new Set([g.players[(index+n-1)%n],g.players[(index+1)%n]].filter(t=>t.alive&&t.id!==id).map(t=>t.id))];
 }
 return living.filter(t=>!occupied?.includes(t.id)&&(['priest','old_hag','spellcaster','mummy','paranormal_investigator'].includes(step)||t.id!==id)).map(t=>t.id);
}
export function extraActors(g: Game, step: ExtraStep): string[] {
 if(!isExtended(g)||step==='bogeyman'&&!g.extra?.wolfTimedOut||step==='leprechaun'&&g.biteTargets.length===0)return [];
 return g.players.filter(p=>(p.alive||step==='ghost'&&p.role==='ghost'&&!g.extra?.withdrawn.includes(p.id)||step==='bloody_mary'&&p.role==='bloody_mary'&&!p.alive&&!!g.extra?.players[p.id]?.grudge&&!g.extra?.withdrawn.includes(p.id)&&g.night>(g.extra?.players[p.id]?.deathNight??g.night)) && hasPower(g,p,step) && (
  EXTRA_OPENING.includes(step as typeof EXTRA_OPENING[number])
   ? step==='drunk' ? g.night>=3&&!(g.extra?.players[p.id]?.initialized??[]).includes(step) : !(g.extra?.players[p.id]?.initialized??[]).includes(step)
   : !['priest','paranormal_investigator','huntress','troublemaker'].includes(step)||!(g.extra?.players[p.id]?.used??[]).includes(step) || Object.hasOwn(g.actions,p.id)
 )).map(p=>p.id).filter(id=>['mason','minion','beholder','count','insomniac','drunk','troublemaker','nostradamus','blob','ghost'].includes(step)||extraTargets(g,id).length>=(step==='hoodlum'||step==='leprechaun'?2:1));
}
export function extraTurn(g: Game,id:string): ExtraTurn | null {
 if(!isExtraStep(g.step)||!isExtended(g))return null;
 const kind=g.step;
 return {kind,choices:kind==='drunk'?['draw']:kind==='nostradamus'?predictionChoices(g):undefined,count:['leprechaun','hoodlum'].includes(kind)?2:['mason','minion','beholder','count','insomniac','drunk','troublemaker','nostradamus','blob','ghost'].includes(kind)?0:1,allowPass:['priest','paranormal_investigator','huntress','troublemaker','leprechaun'].includes(kind),input:kind==='nostradamus'?'prediction':kind==='drunk'?'draw':kind==='ghost'?'note':['mason','minion','beholder','count','insomniac'].includes(kind)?'ack':'targets'};
}
export function applyExtraAction(g:Game,id:string,a:Action,c:ExtensionContext) {
 const turn=extraTurn(g,id);c.check(turn,'WRONG_PHASE');
 c.check(a.type==='ability','WRONG_ABILITY');
 c.check(!a.pass||turn.allowPass,'INVALID_ACTION');
 if(a.pass)return;
 c.check(a.targets.length===turn.count && new Set(a.targets).size===a.targets.length,'INVALID_TARGET');
 c.check(a.targets.every(t=>extraTargets(g,id).includes(t)),'INVALID_TARGET');
 const s=extraPlayer(g,id),step=turn.kind;
 const result=(data:Record<string,unknown>)=>c.event(g,'ability-result',{kind:step,...data},id);
 const t=a.targets[0];
 if(step==='mason') result({people:g.players.filter(p=>p.alive&&hasPower(g,p,'mason')&&p.id!==id).map(p=>p.id)});
 else if(step==='minion')result({people:g.players.filter(p=>p.alive&&isWolf(p.role)).map(p=>p.id)});
 else if(step==='beholder')result({people:g.players.filter(p=>p.alive&&hasPower(g,p,'seer')).map(p=>p.id)});
 else if(step==='count') {
  const i=g.players.findIndex(p=>p.id===id), ordered=[...g.players.slice(i+1),...g.players.slice(0,i)];const split=Math.ceil(ordered.length/2);
  const first=ordered.slice(0,split),second=ordered.slice(split);
  result({first:first.map(p=>p.id),second:second.map(p=>p.id),firstCount:first.filter(p=>p.alive&&isWolf(p.role)).length,secondCount:second.filter(p=>p.alive&&isWolf(p.role)).length});
 }else if(step==='insomniac')result({awake:c.neighbors(g,id).some(t=>extraState(g).woke.includes(t))});
 else if(step==='sorceress')result({target:t,isSeer:hasPower(g,g.players.find(p=>p.id===t)!,'seer')});
 else if(step==='paranormal_investigator')result({target:t,isWolf:[t,...c.neighbors(g,t)].some(x=>isWolf(g.players.find(p=>p.id===x)!.role))});
 else if(step==='priest'){extraPlayer(g,t).blessed=true;c.event(g,'blessing',{actor:id,target:t});}
 else if(step==='the_thing') { c.event(g,'tapped',{message:'Bạn được The Thing vỗ vai.'},t);c.event(g,'ability-result',{kind:step,target:t},id); }
 else if(step==='ghost'){
  const text=a.text?.normalize('NFC').trim()??'';c.check(/^[\p{L}\p{N}]+$/u.test(text)&&text.length<=40&&!g.players.some(p=>p.name.toLocaleLowerCase('vi')===text.toLocaleLowerCase('vi')),'INVALID_HINT');
  extraState(g).notes.push({actor:id,text,approved:null});
 }
 else if(step==='bogeyman'||step==='bloody_mary')extraState(g).attacks.push({actor:id,target:t,cause:step});
 else if(step==='drunk'){c.check(turn.choices?.includes(a.choice??''),'INVALID_ACTION');c.event(g,'draw-request',{actor:id});}
 else if(step==='nostradamus'){c.check(turn.choices?.includes(a.choice??''),'INVALID_ACTION');s.prediction=a.choice;}
 else if(step==='hoodlum')s.marked=[...a.targets];
 else if(step==='cult_leader')s.cult=[...(s.cult??[]),t];
 else if(step==='zombie')s.brainEaten=[...(s.brainEaten??[]),t];
 else if(step==='dracula'){s.brides=[...(s.brides??[]),t];if(s.brides.length>=3&&s.bridesAt===undefined)s.bridesAt=g.night;}
 else if(step==='blob'){const i=g.players.findIndex(p=>p.id===id);for(let n=1;n<g.players.length;n++){const p=g.players[(i+n)%g.players.length];if(p.alive&&!(s.invaded??[]).includes(p.id)){s.invaded=[...(s.invaded??[]),p.id];break;}}}
 else if(step==='chupacabra'){if(!g.players.some(p=>p.alive&&isWolf(p.role))||isWolf(g.players.find(p=>p.id===t)!.role))extraState(g).attacks.push({actor:id,target:t,cause:'chupacabra'});}
 else if(step==='leprechaun'){c.check(g.biteTargets.includes(a.targets[0])&&livingAdjacent(g,a.targets[0]).includes(a.targets[1])&&!g.biteTargets.includes(a.targets[1]),'INVALID_TARGET');g.biteTargets=g.biteTargets.map(t=>t===a.targets[0]?a.targets[1]:t);g.biteTarget=g.biteTargets[0]??null;}
 else if(step==='vampire')extraState(g).vampireVictims.push(t);
 else if(['old_hag','spellcaster','mummy'].includes(step))extraState(g).pending.push({actor:id,target:t,kind:step});
 else if(step==='troublemaker')extraState(g).pending.push({actor:id,target:id,kind:step});
 else if(step==='huntress')extraState(g).attacks.push({actor:id,target:t,cause:'huntress'});
 else if(step==='revealer')extraState(g).attacks.push({actor:id,target:isWolf(g.players.find(p=>p.id===t)!.role)?t:id,cause:'revealer'});
 else c.check(false,'UNSUPPORTED_ROLE');
 if(['priest','paranormal_investigator','huntress','troublemaker'].includes(step))s.used=[...(s.used??[]),step];
}
export function finishExtraStep(g:Game,ids:string[]) {
 const e=extraState(g);
 for(const id of ids){const p=extraPlayer(g,id);p.initialized=[...new Set([...(p.initialized??[]),g.step])];if(!e.woke.includes(id))e.woke.push(id);if(!e.everWoke.includes(id))e.everWoke.push(id);}
}
export function nightImmune(g:Game,id:string,causes:string[]) {
 return isExtended(g)&&g.step!=='day'&&!!g.extra?.players[id]?.blessed&&!causes.some(c=>['missing','sacrifice','penalty'].includes(c));
}

export function publishDayPowers(g: Game, emit: ExtensionContext['event']) {
 if(!isExtended(g))return;
 const e=extraState(g);e.day={absent:[],silent:[],mummy:[],brainEaten:[]};e.verdictsRemaining=1;e.dayKills=0;e.day.brainEaten=[...new Set(Object.values(e.players).flatMap(p=>p.brainEaten??[]))];
 for(const p of e.pending){
  if(p.kind==='old_hag')e.day.absent.push(p.target);
  if(p.kind==='spellcaster')e.day.silent.push(p.target);
  if(p.kind==='mummy')e.day.mummy.push({actor:p.actor,target:p.target});
  if(p.kind==='troublemaker')e.verdictsRemaining=2;
 }
 if(e.day.brainEaten.length||e.day.absent.length||e.day.silent.length||e.day.mummy.length||e.verdictsRemaining===2){
  emit(g,'day-restrictions',{brainEaten:[...e.day.brainEaten],absent:[...e.day.absent],silent:[...e.day.silent],controlled:e.day.mummy.map(p=>p.target),verdicts:e.verdictsRemaining});g.events.at(-1)!.audience='public';
 }
}
export function votingRule(g: Game,id:string) {
 const p=g.players.find(p=>p.id===id)!;const d=g.extra?.day;
 return {canVote:!d?.absent.includes(id)&&!d?.brainEaten.includes(id),canSpeak:!d?.absent.includes(id)&&!d?.silent.includes(id),weight:hasPower(g,p,'mayor')?2:1,required:hasPower(g,p,'pacifist')?'spare':hasPower(g,p,'idiot')?'kill':null,follow:!!d?.mummy.some(t=>t.target===id)};
}

function livingAdjacent(g:Game,id:string) {
 const living=g.players.filter(p=>p.alive).map(p=>p.id),i=living.indexOf(id);
 return [...new Set([living[(i+living.length-1)%living.length],living[(i+1)%living.length]].filter(t=>t&&t!==id))];
}
export function wolverineCue(g:Game,emit:ExtensionContext['event']){
 const ids=g.players.filter(p=>p.alive).map(p=>p.id),n=ids.length;
 const wolves=g.players.filter(p=>p.alive&&(isWolf(p.role)||p.role==='frankenstein'&&g.extra?.players[p.id]?.powers?.some(r=>isWolf(r as Role))));
 const dist=(a:string,b:string)=>{const d=Math.abs(ids.indexOf(a)-ids.indexOf(b));return Math.min(d,n-d);};
 if(g.biteTargets.some(t=>wolves.some(p=>hasPower(g,p,'wolverine')&&dist(p.id,t)===Math.min(...wolves.map(w=>dist(w.id,t)))))){
  emit(g,'metal-sound',{});g.events.at(-1)!.audience='public';
 }
}

export function independentWinner(g: Game): Game['winner'] {
 const e=g.extra!; const living=g.players.filter(p=>p.alive);
 if(living.length===1&&living[0].role==='lone_wolf')return 'lone_wolf';
 if(g.players.some(p=>p.role==='tanner'&&g.publicDead.includes(p.id)&&!e.withdrawn.includes(p.id)))return 'tanner';
 if(living.some(p=>p.role==='bogeyman')&&!living.some(p=>p.role!=='bogeyman'&&(nightWaker(p.role)||(p.role==='frankenstein'&&e.players[p.id]?.powers?.some(r=>nightWaker(r as Role))))))return 'bogeyman';
 for(const kind of ['cult_leader','blob','zombie','dracula','chupacabra'] as const){
  for(const p of living.filter(p=>p.role===kind)){
   const s=e.players[p.id]??{},xs=kind==='cult_leader'?s.cult:kind==='blob'?s.invaded:kind==='zombie'?s.brainEaten:undefined;
   if(xs&&living.every(t=>t.id===p.id||xs.includes(t.id)))return kind==='cult_leader'?'cult':kind;
   if(kind==='dracula'&&s.bridesAt!==undefined&&s.bridesAt<g.night&&(s.brides??[]).filter(id=>living.some(t=>t.id===id)).length>=3)return 'dracula';
   if(kind==='chupacabra'&&living.length===1)return 'chupacabra';
  }
 }
 return null;
}
export function overrideWinner(g:Game) {
 const e=g.extra!,base=g.winner;if(!base||base==='draw'||base==='tanner')return;
 const hoodlum=g.players.find(p=>p.alive&&p.role==='hoodlum'&&e.players[p.id]?.marked?.length===2&&e.players[p.id].marked!.every(id=>g.publicDead.includes(id)&&!e.withdrawn.includes(id)));
 const mary=g.players.find(p=>p.role==='bloody_mary'&&!p.alive&&!e.withdrawn.includes(p.id)&&e.players[p.id]?.grudge&&base!==e.players[p.id].grudge);
 const nost=g.players.find(p=>p.alive&&p.role==='nostradamus'&&e.players[p.id]?.prediction===base);
 if(hoodlum){g.winner='hoodlum';e.winnerIds=[hoodlum.id];}
 else if(mary){g.winner='bloody_mary';e.winnerIds=[mary.id];}
 else if(nost){g.winner='nostradamus';e.winnerIds=[nost.id];}
}

export function nightWaker(role:Role){return !['villager','lycan','cursed','tough_guy','diseased','prince','mad_bomber','apprentice_seer','idiot','mayor','pacifist','tanner','bigfoot','frankenstein'].includes(role);}

function predictionChoices(g:Game){
 const choices=['village','wolves'];
 for(const [role,winner] of [['vampire','vampires'],['cult_leader','cult'],['cupid','lovers'],['lone_wolf','lone_wolf'],['bogeyman','bogeyman'],['blob','blob'],['zombie','zombie'],['dracula','dracula'],['chupacabra','chupacabra']])if(g.players.some(p=>hasPower(g,p,role)))choices.push(winner);
 return choices;
}

export function progressSignature(g:Game){
 const e=g.extra!;return JSON.stringify({living:g.players.filter(p=>p.alive).map(p=>[p.id,p.role,p.resources,p.delayedDeathNight]),progress:Object.entries(e.players).map(([id,p])=>[id,p.cult,p.invaded,p.brainEaten,p.brides,p.powers,p.used,p.blessed])});
}
