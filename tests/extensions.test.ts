import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import type { Action, Command, Game, Role } from '../src/engine/types.ts';
const make=(roles:Record<string,Role>)=>createGame('extensions',Object.entries({w:'wolf',a:'villager',b:'villager',c:'villager',d:'villager',...roles} as Record<string,Role>).map(([id,role])=>({id,name:id,role})),{witchSeesBite:true,skipVoteDays:30});
const cmd=(g:Game,command:Command,id?:string)=>dispatch(g,id?{kind:'player',playerId:id}:{kind:'moderator'},{id:'r'+g.revision,gameId:g.id,stepId:stepId(g),command});
const act=(g:Game,id:string,action:Action)=>cmd(cmd(g,{type:'wake'},id),{type:'act',action},id);
function advance(g:Game,actions:Record<string,Action>={}) {
 for(const id of actors(g).filter(id=>!Object.hasOwn(g.actions,id))){
  const v=playerView(g,id), ts=v.turn!.targets,power=v.turn!.power;
  const action:Action=actions[id]??(power?{type:'ability',targets:ts.slice(0,power.count),...(power.allowPass?{targets:[],pass:true}:{})}:g.step==='wolves'?{type:'bite',target:g.biteTargets[0]??Object.values(g.actions).flatMap(a=>a.type==='bite'?[a.target]:[])[0]??ts[0]}:g.step==='guard'?{type:'protect',target:ts[0]}:g.step==='hunter'?{type:'shoot',target:ts[0]}:g.step==='seer'?{type:'inspect',target:ts[0]}:{type:'potion',heal:false,poison:null});
  g=act(g,id,action);
 }
 return cmd(g,{type:'advance'});
}
function until(g:Game,step:string,actions:Record<string,Action>={}){for(let i=0;g.step!==step&&i<45;i++)g=advance(g,actions);assert.equal(g.step,step);return g;}
const result=(g:Game,id:string)=>playerView(g,id).messages.findLast(e=>e.type==='ability-result')?.data;
const ability=(...targets:string[]):Action=>({type:'ability',targets});
const dawn=(g:Game,actions:Record<string,Action>={})=>cmd(cmd(until(g,'review',actions),{type:'resolve'}),{type:'publish'});
const next=(g:Game)=>cmd(cmd(g,{type:'verdict',target:null}),{type:'nextNight'});

test('Masons know one another, private information never enters projections of other players',()=>{
 let g=make({m:'mason',n:'mason',s:'seer'});g=until(g,'mason');g=act(g,'m',ability());
 assert.deepEqual(result(g,'m')?.people,['n']);assert.equal(result(g,'a'),undefined);
 assert.ok(!JSON.stringify(publicView(g)).includes('ability-result'));
 const before=structuredClone(g);for(const p of g.players)playerView(g,p.id);assert.deepEqual(g,before);
 assert.throws(()=>act(g,'m',ability()),(e:unknown)=>e instanceof RuleError&&e.code==='ACTION_ALREADY_CONFIRMED');
 g=advance(g,{m:ability(),n:ability()});
});

test('Beholder, Count and Sorceress return authorized information only',()=>{
 let g=until(make({be:'beholder',co:'count',s:'seer',so:'sorceress'}),'beholder');
 g=act(g,'be',ability());assert.deepEqual(result(g,'be')?.people,['s']);g=cmd(g,{type:'advance'});
 g=act(g,'co',ability());assert.equal(Number(result(g,'co')?.firstCount)+Number(result(g,'co')?.secondCount),1);g=cmd(g,{type:'advance'});
 g=until(g,'sorceress');g=act(g,'so',ability('s'));assert.equal(result(g,'so')?.isSeer,true);assert.equal(playerView(g,'so').pack,null);
 assert.equal(result(g,'a'),undefined);
});

test('Minion joins consensus and chat but is human to Seer; sleeping Dream target cannot strand the pack',()=>{
 let g=until(make({mi:'minion',dw:'dream_wolf',s:'seer'}),'seer');g=advance(g,{s:{type:'inspect',target:'mi'}});
 assert.equal(playerView(g,'s').messages.findLast(e=>e.type==='inspection')?.data.isWolf,false);
 assert.deepEqual(new Set(actors(g)),new Set(['w','mi']));
 for(const id of actors(g))g=cmd(g,{type:'wake'},id);
 g=cmd(g,{type:'chat',text:'chọn a'},'mi');assert.equal(playerView(g,'w').packChat.items.length,1);assert.equal(playerView(g,'a').packChat.items.length,0);
 assert.ok(playerView(g,'mi').turn!.targets.includes('dw'));
 g=cmd(g,{type:'act',action:{type:'bite',target:'a'}},'w');g=cmd(g,{type:'act',action:{type:'bite',target:'a'}},'mi');g=cmd(g,{type:'advance'});assert.equal(g.step,'witch');
});

test('PI checks a target and nearest living neighbors, consumes once and can hold',()=>{
 let g=until(make({pi:'paranormal_investigator'}),'paranormal_investigator');
 g=act(g,'pi',ability('a'));assert.equal(result(g,'pi')?.isWolf,true);g=cmd(g,{type:'advance'});
 g=next(dawn(g));assert.ok(!actors({...g,step:'paranormal_investigator'}).includes('pi'));
});

test('Priest blessing blocks bite and poison permanently but never a daytime verdict',()=>{
 let g=until(make({pr:'priest',wi:'witch'}),'priest');g=advance(g,{pr:ability('a')});
 g=dawn(g,{wi:{type:'potion',heal:false,poison:'a'}});assert.equal(g.players.find(p=>p.id==='a')!.alive,true);
 g=cmd(g,{type:'verdict',target:'a'});assert.equal(g.players.find(p=>p.id==='a')!.alive,false);
});

test('Thing can only tap fixed adjacent living seats and sends no author identity',()=>{
 let g=until(make({th:'the_thing'}),'the_thing');const ts=playerView(g,'th').turn!.targets;
 assert.deepEqual(ts,['d','w']);assert.throws(()=>act(g,'th',ability('b')));
 g=act(g,'th',ability('d'));const tap=playerView(g,'d').messages.find(e=>e.type==='tapped');assert.ok(tap);assert.ok(!('actor' in tap!.data));assert.equal(playerView(g,'b').messages.length,0);
});

test('Insomniac sees wake activity, not neighbor identities or actions',()=>{
 let g=until(make({i:'insomniac'}),'insomniac');g=act(g,'i',ability());assert.equal(result(g,'i')?.awake,true);assert.deepEqual(Object.keys(result(g,'i')!).sort(),['awake','kind']);
});

test('Old Hag, Spellcaster and Mummy publish day restrictions only at dawn',()=>{
 let g=until(make({oh:'old_hag',sp:'spellcaster',mu:'mummy'}),'review',{oh:ability('b'),sp:ability('c'),mu:ability('d')});
 assert.equal(publicView(g).announcements.some(e=>e.type==='day-restrictions'),false);
 g=cmd(cmd(g,{type:'resolve'}),{type:'publish'});
 assert.equal(playerView(g,'b').self.voting?.canVote,false);assert.equal(playerView(g,'c').self.voting?.canSpeak,false);assert.equal(playerView(g,'d').self.voting?.follow,true);
 assert.ok(!JSON.stringify(publicView(g).announcements.find(e=>e.type==='day-restrictions')).includes('"actor"'));
});

test('Huntress is optional one shot; Revealer kills actual wolf and dies on a human',()=>{
 let g=dawn(make({h:'huntress',r:'revealer'}),{h:ability('b'),r:ability('c')});
 assert.ok(['a','b','r'].every(id=>!g.players.find(p=>p.id===id)!.alive));assert.equal(g.players.find(p=>p.id==='c')!.alive,true);
 g=next(g);assert.deepEqual(actors({...g,step:'huntress'}),[]);
 const correct=dawn(make({r:'revealer'}),{r:ability('w')});assert.equal(correct.players.find(p=>p.id==='r')!.alive,true);assert.equal(correct.winner,'village');
});

test('Troublemaker requires two separate verdicts, vote attributes stay private',()=>{
 let g=dawn(make({tr:'troublemaker',ma:'mayor',pa:'pacifist',idi:'idiot'}),{tr:ability()});
 assert.equal(g.extra!.verdictsRemaining,2);g=cmd(g,{type:'verdict',target:'b'});assert.equal(g.verdictDone,false);assert.throws(()=>cmd(g,{type:'nextNight'}));
 g=cmd(g,{type:'verdict',target:'c'});assert.equal(g.verdictDone,true);
 assert.equal(playerView(g,'ma').self.voting?.weight,2);assert.equal(playerView(g,'pa').self.voting?.required,'spare');assert.equal(playerView(g,'idi').self.voting?.required,'kill');
});

test('Vampire victim survives dawn and dies only after final verdict; bite immunity applies',()=>{
 let g=dawn(make({v:'vampire'}),{v:ability('b'),w:{type:'bite',target:'v'}});
 assert.equal(g.players.find(p=>p.id==='b')!.alive,true);assert.equal(g.players.find(p=>p.id==='v')!.alive,true);assert.ok(!g.publicDead.includes('b'));
 g=cmd(g,{type:'verdict',target:'c'});assert.equal(g.players.find(p=>p.id==='b')!.alive,false);assert.ok(g.publicDead.includes('b'));
});

test('Vampire delayed kill keeps night Hunter mark and Priest immunity',()=>{
 let g=dawn(make({v:'vampire',h:'hunter'}),{v:ability('h'),h:{type:'shoot',target:'b'}});
 g=cmd(g,{type:'verdict',target:'c'});assert.ok(['h','b'].every(id=>!g.players.find(p=>p.id===id)!.alive));
 let blessed=dawn(make({v:'vampire',pr:'priest'}),{v:ability('b'),pr:ability('b')});blessed=cmd(blessed,{type:'verdict',target:'c'});assert.equal(blessed.players.find(p=>p.id==='b')!.alive,true);
});

test('Leprechaun redirects one existing bite to an adjacent living seat and can keep it',()=>{
 let g=until(make({l:'leprechaun'}),'leprechaun');assert.deepEqual(playerView(g,'l').redirectBites,['a']);assert.deepEqual(playerView(g,'b').redirectBites,[]);
 assert.throws(()=>act(g,'l',ability('a','d')));
 g=advance(g,{l:ability('a','b')});g=dawn(g);assert.equal(g.players.find(p=>p.id==='a')!.alive,true);assert.equal(g.players.find(p=>p.id==='b')!.alive,false);
});

test('Wolverine cue exposes no identity; Bigfoot changes next night after no hanging',()=>{
 let g=until(make({wv:'wolverine'}),'wolves');g=advance(g,{w:{type:'bite',target:'d'},wv:{type:'bite',target:'d'}});
 assert.deepEqual(publicView(g).announcements.find(e=>e.type==='metal-sound')?.data,{});
 let big=dawn(make({bf:'bigfoot'}));big=next(big);assert.equal(big.players.find(p=>p.id==='bf')!.role,'wolf');
});

test('Tanner wins only at publication and withdrawal is never a winning death',async()=>{
 const {withdrawPlayer}=await import('../src/engine/engine.ts');
 let g=until(make({t:'tanner'}),'review',{w:{type:'bite',target:'t'}});g=cmd(g,{type:'resolve'});assert.equal(g.winner,null);g=cmd(g,{type:'publish'});assert.equal(g.winner,'tanner');
 const withdrawn=withdrawPlayer(make({t:'tanner'}),'t');assert.equal(withdrawn.winner,null);
});

test('Hoodlum and Nostradamus replace faction winners, never add a second winning faction',()=>{
 let g=until(make({h:'hoodlum'}),'hoodlum');g=advance(g,{h:ability('a','b')});g=dawn(g);g=cmd(g,{type:'verdict',target:'b'});g=cmd(g,{type:'nextNight'});g=dawn(g,{w:{type:'bite',target:'c'}});g=cmd(g,{type:'verdict',target:'w'});assert.equal(g.winner,'hoodlum');assert.deepEqual(g.extra!.winnerIds,['h']);
 let n=until(make({n:'nostradamus'}),'nostradamus');n=advance(n,{n:{type:'ability',targets:[],choice:'village'}});n=dawn(n);n=cmd(n,{type:'verdict',target:'w'});assert.equal(n.winner,'nostradamus');assert.deepEqual(n.extra!.winnerIds,['n']);
});

test('Cult, Blob and Zombie track their own progress; repeated recruitment is refused',()=>{
 for(const [role,field,winner] of [['cult_leader','cult','cult'],['blob','invaded','blob'],['zombie','brainEaten','zombie']] as const){
  let g=make({x:role});g.extra!.players.x={[field]:['w','a','b','c']};g=until(g,role);
  if(role!=='blob')assert.throws(()=>act(g,'x',ability('b')));
  g=advance(g,{x:role==='blob'?ability():ability('d')});g=dawn(g);assert.equal(g.winner,winner);
 }
 let z=dawn(make({z:'zombie'}),{z:ability('b')});assert.equal(playerView(z,'b').self.voting?.canVote,false);assert.equal(z.winner,null);
});

test('Dracula waits a full following night, and a dead bride no longer counts',()=>{
 let g=make({dr:'dracula',pr:'priest'});g.extra!.players.dr={brides:['b','c','d'],bridesAt:1};g=dawn(g,{dr:ability('w'),pr:ability('a')});assert.equal(g.winner,null);
 const day=structuredClone(g);g=next(g);g=dawn(g,{dr:ability('pr'),w:{type:'bite',target:'a'}});assert.equal(g.winner,'dracula');
 day.extra!.players.dr.brides=['b','c','d'];
 let lost=cmd(day,{type:'verdict',target:'b'});lost=cmd(lost,{type:'nextNight'});lost=dawn(lost,{dr:ability('w'),w:{type:'bite',target:'c'}});assert.equal(lost.winner,null);
});

test('Chupacabra kills wolves, wrong guesses spare humans, then can kill anyone',()=>{
 let g=dawn(make({ch:'chupacabra'}),{ch:ability('b')});assert.equal(g.players.find(p=>p.id==='b')!.alive,true);
 let hit=dawn(make({ch:'chupacabra'}),{ch:ability('w')});assert.equal(hit.players.find(p=>p.id==='w')!.alive,false);assert.equal(hit.winner,null);hit=next(hit);hit=dawn(hit,{ch:ability('b')});assert.equal(hit.players.find(p=>p.id==='b')!.alive,false);
});

test('Ghost sends one word after death and requires explicit moderator review',()=>{
 let g=until(make({gh:'ghost'}),'ghost');assert.throws(()=>act(g,'gh',{type:'ability',targets:[],text:'hai từ'}));assert.throws(()=>act(g,'gh',{type:'ability',targets:[],text:'a'}));
 g=advance(g,{gh:{type:'ability',targets:[],text:'rừng'}});assert.equal(publicView(g).announcements.some(e=>e.type==='ghost-hint'),false);
 assert.throws(()=>cmd(g,{type:'reviewNote',actor:'gh',approve:true},'b'));
 g=cmd(g,{type:'reviewNote',actor:'gh',approve:true});assert.equal(publicView(g).announcements.find(e=>e.type==='ghost-hint')?.data.text,'rừng');g=dawn(g);assert.equal(g.players.find(p=>p.id==='gh')!.alive,false);g=next(g);g=until(g,'ghost');assert.ok(actors(g).includes('gh'));
});

test('Bogeyman only acts after moderator wolf timeout and receives no stale wolf target',()=>{
 let g=until(make({bo:'bogeyman',w2:'wolf'}),'wolves');assert.deepEqual(actors({...g,step:'bogeyman'}),[]);
 g=act(g,'w',{type:'bite',target:'a'});assert.throws(()=>cmd(g,{type:'wolfTimeout'},'b'));g=cmd(g,{type:'wolfTimeout'});assert.equal(g.biteTargets.length,0);g=until(g,'bogeyman');g=advance(g,{bo:ability('b')});g=dawn(g);assert.equal(g.players.find(p=>p.id==='a')!.alive,true);assert.equal(g.players.find(p=>p.id==='b')!.alive,false);
});

test('Drunk draws only once on night 3 and remains human before that',()=>{
 let g=dawn(make({dr:'drunk'}));g=next(g);g=dawn(g,{w:{type:'bite',target:'b'}});g=next(g);assert.equal(g.step,'drunk');g=act(g,'dr',{type:'ability',targets:[],choice:'draw'});const draw=result(g,'dr')?.role;assert.ok(draw);assert.equal(g.players.find(p=>p.id==='dr')!.role,'drunk');g=cmd(g,{type:'advance'});assert.equal(g.players.find(p=>p.id==='dr')!.role,draw);assert.notEqual(g.step,'drunk');
});

test('Bloody Mary returns starting next night and targets her killer faction',()=>{
 let g=dawn(make({bm:'bloody_mary'}),{w:{type:'bite',target:'bm'}});assert.equal(g.extra!.players.bm.grudge,'wolves');g=next(g);g=until(g,'bloody_mary');assert.deepEqual(playerView(g,'bm').turn!.targets,['w']);g=advance(g,{bm:ability('w')});g=dawn(g);assert.equal(g.winner,'bloody_mary');assert.deepEqual(g.extra!.winnerIds,['bm']);
});

test('Frankenstein inherits after publication, accumulates actual usable actions, and keeps village identity',()=>{
 let g=until(make({f:'frankenstein',s:'seer',pr:'priest'}),'review',{w:{type:'bite',target:'s'}});g=cmd(g,{type:'resolve'});assert.deepEqual(playerView(g,'f').self.powers,[]);g=cmd(g,{type:'publish'});assert.deepEqual(playerView(g,'f').self.powers,['seer']);g=cmd(g,{type:'verdict',target:'pr'});assert.deepEqual(new Set(playerView(g,'f').self.powers),new Set(['seer','priest']));g=cmd(g,{type:'nextNight'});g=until(g,'seer');assert.deepEqual(actors(g),['f']);g=advance(g,{f:{type:'inspect',target:'w'}});assert.equal(playerView(g,'f').messages.findLast(e=>e.type==='inspection')?.data.isWolf,true);g=until(g,'priest');g=advance(g,{f:ability('f')});assert.equal(g.extra!.players.f.blessed,true);assert.equal(playerView(g,'f').self.team,'village');assert.equal(playerView(g,'f').self.role,'frankenstein');
});

test('Teen Wolf and Mason penalties are explicit, logged and disqualify the violator',()=>{
 let g=until(make({tw:'teen_wolf',m:'mason'}),'wolves');g=cmd(g,{type:'penalty',target:'tw'});assert.equal(g.players.find(p=>p.id==='tw')!.alive,true);assert.equal(g.extra!.players.tw.disqualified,true);assert.ok(g.events.some(e=>e.type==='rule-penalty'));g=cmd(g,{type:'penalty',target:'b'});
 g=dawn(g);assert.ok(g.publicDead.includes('tw'));assert.ok(!g.extra!.winnerIds?.includes('tw'));
});

test('Lone Wolf cannot win alongside the pack and wins only as last survivor',()=>{
 let g=dawn(make({lw:'lone_wolf'}));g=cmd(g,{type:'verdict',target:'w'});assert.equal(g.winner,null);
 const lone=g.players.find(p=>p.id==='lw')!;for(const p of g.players)if(p.id!=='lw'){p.alive=false;if(!g.publicDead.includes(p.id))g.publicDead.push(p.id);}g.verdictDone=false;g.extra!.verdictsRemaining=1;g=cmd(g,{type:'verdict',target:null});assert.equal(g.winner,'lone_wolf');assert.deepEqual(g.extra!.winnerIds,[lone.id]);
});

test('Moderator cannot erase an agreed wolf ballot as a timeout',()=>{
 let g=until(make({bo:'bogeyman'}),'wolves');g=act(g,'w',{type:'bite',target:'a'});assert.throws(()=>cmd(g,{type:'wolfTimeout'}),(e:unknown)=>e instanceof RuleError&&e.code==='WOLVES_ALREADY_AGREED');
});

test('Frankenstein receives remaining one-shot resources and passive vote powers without restoring used abilities',()=>{
 let g=make({f:'frankenstein',pr:'priest',ma:'mayor',wi:'witch'});g=dawn(g,{pr:ability('a'),w:{type:'bite',target:'pr'},wi:{type:'potion',heal:false,poison:'ma'}});assert.ok(g.extra!.players.f.powers?.includes('priest'));assert.equal(playerView(g,'f').self.voting?.weight,2);g=next(g);assert.deepEqual(actors({...g,step:'priest'}),[]);
});

test('Legacy games reject newer roles rather than silently enabling v14 abilities',()=>{
 const g=make({x:'vampire'});g.rulesVersion='classic-core-v13';g.schemaVersion=8;assert.throws(()=>cmd(g,{type:'advance'}),(e:unknown)=>e instanceof RuleError&&e.code==='UNSUPPORTED_ROLE');
});

test('two full rounds without progress settle an otherwise impossible third-party duel as a draw',()=>{
 let g=dawn(make({ch:'chupacabra',pr:'priest',prince:'prince'}),{ch:ability('w'),pr:ability('prince')});
 g=cmd(cmd(g,{type:'verdict',target:'b'}),{type:'nextNight'});g=dawn(g,{ch:ability('c')});g=cmd(cmd(g,{type:'verdict',target:'d'}),{type:'nextNight'});g=dawn(g,{ch:ability('pr')});
 g=cmd(cmd(g,{type:'verdict',target:'prince'}),{type:'nextNight'});
 for(let i=0;i<2;i++){g=dawn(g,{ch:ability('prince')});g=cmd(cmd(g,{type:'verdict',target:'prince'}),{type:'nextNight'});}
 assert.equal(g.winner,'draw');assert.equal(g.step,'ended');
});
