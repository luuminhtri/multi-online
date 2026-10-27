import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, actors, stepId } from '../src/engine/engine.ts';
import { playerView, publicView } from '../src/engine/views.ts';
import { ROLES } from '../src/engine/rules.ts';
import { isWolf } from '../src/engine/role-policy.ts';
import type { Action, Command, Role } from '../src/engine/types.ts';

test('100 mixed v14 tables preserve state, secret projections, retries and complete legal turns',()=>{
 const pool=(Object.keys(ROLES) as Role[]).filter(r=>!isWolf(r)&&r!=='villager');
 for(let seed=1;seed<=100;seed++){
  let rand=seed;const pick=<T>(a:T[])=>{assert.ok(a.length,`seed ${seed}: no legal target`);rand=(Math.imul(rand,1664525)+1013904223)>>>0;return a[rand%a.length];};
  const choices=[...pool],roles:Role[]=['wolf','villager','villager','villager'];for(let n=0;n<5;n++){const r=pick(choices);choices.splice(choices.indexOf(r),1);roles.push(r);}
  let g=createGame('mixed'+seed,roles.map((role,i)=>({id:'p'+i,name:'Seat'+i,role})),{witchSeesBite:seed%2===0,skipVoteDays:30});
  for(let n=0;g.step!=='ended'&&n<600;n++){
   const input=g,before=structuredClone(g);let id:string|undefined,command:Command;
   if(g.step==='review')command={type:g.resolved?'publish':'resolve'};
   else if(g.step==='day')command=g.verdictDone?{type:'nextNight'}:{type:'verdict',target:g.players.find(p=>p.alive&&p.role!=='prince')!.id};
   else{
    id=actors(g).find(id=>!Object.hasOwn(g.actions,id));
    if(!id)command={type:'advance'};
    else if(!g.awake.includes(id))command={type:'wake'};
    else{
     const v=playerView(g,id),t=v.turn!,ts=t.targets;const one=()=>pick(ts),pair=()=>{const x=one();return [x,pick(ts.filter(t=>t!==x))] as [string,string];};let action:Action;
     if(t.power){const p=t.power;action=p.allowPass&&p.kind==='leprechaun'?{type:'ability',targets:[],pass:true}:{type:'ability',targets:p.count===2?pair():p.count===1?[one()]:[],...(p.input==='prediction'?{choice:pick(p.choices!)}:p.input==='draw'?{choice:'draw'}:p.input==='note'?{text:'rừng'}:{})};}
     else if(g.step==='wolves'){const prior=Object.values(g.actions)[0];action=prior??(t.wolfPlan!.maxTargets===0?{type:'fast'}:t.wolfPlan!.minTargets===2?{type:'maul',targets:pair()}:{type:'bite',target:one()});}
     else if(g.step==='guard')action={type:'protect',target:one()};
     else if(['seer','aura_seer','mystic_seer'].includes(g.step))action={type:'inspect',target:one()};
     else if(g.step==='mentalist')action={type:'compare',targets:pair()};
     else if(g.step==='cupid')action={type:'pair',targets:pair()};
     else if(g.step==='doppelganger')action={type:'mimic',target:one()};
     else if(g.step==='dire_wolf'||g.step==='virginia_woolf')action={type:'bond',target:one()};
     else if(g.step==='alpha_wolf')action={type:'convert',target:null};
     else if(g.step==='hunter')action={type:'shoot',target:one()};
     else action={type:'potion',heal:false,poison:null};
     command={type:'act',action};
    }
   }
   const who=id?{kind:'player' as const,playerId:id}:{kind:'moderator' as const},request={id:'r'+n,gameId:g.id,stepId:stepId(g),command};
   try{g=dispatch(g,who,request);}catch(e){throw new Error(`seed ${seed}, turn ${before.step}, ${JSON.stringify(command)}: ${e}`);}
   assert.deepEqual(input,before);
   assert.deepEqual(dispatch(g,who,request),g);
   if(command.type==='resolve'){
    assert.deepEqual(publicView(g),publicView(before),`seed ${seed}: premature public result`);
    for(const p of g.players)assert.deepEqual(playerView(g,p.id),playerView(before,p.id),`seed ${seed}: premature private result for ${p.id}`);
   }
  }
  assert.equal(g.step,'ended',`seed ${seed}: table did not finish`);
 }
});
