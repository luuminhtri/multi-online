import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, stepId, RuleError } from '../src/engine/engine.ts';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { FileRoomRepository } from '../src/server/repositories.ts';
import { RoomService } from '../src/server/rooms.ts';
import { createApiHandler } from '../src/server/http.ts';
const mod = {kind:'moderator'} as const;

test('per-turn flooding is rejected without discarding receipts or blocking first action/moderator progress', () => {
 let g=createGame('storm',[{id:'w',name:'W',role:'wolf'},...['a','b','c'].map(id=>({id,name:id,role:'villager' as const}))]);
 for(const id of ['guard','seer'])g=dispatch(g,mod,{id,gameId:g.id,stepId:stepId(g),command:{type:'advance'}});
 const who={kind:'player',playerId:'w'} as const, sid=stepId(g);
 let rejected=0;
 for(let i=0;i<500;i++) {
  const before=structuredClone(g);
  try{g=dispatch(g,who,{id:'wake-'+i,gameId:g.id,stepId:sid,command:{type:'wake'}});}
  catch(e){assert(e instanceof RuleError);assert.equal(e.code,'REQUEST_LIMIT');assert.deepEqual(g,before);rejected++;}
 }
 assert(rejected>0);assert(Object.keys(g.receipts).length<100);
 const old={id:'wake-0',gameId:g.id,stepId:sid,command:{type:'wake'} as const};
 assert.deepEqual(dispatch(g,who,old),g);
 assert.throws(()=>dispatch(g,who,{...old,command:{type:'act',action:{type:'bite',target:'a'}}}),{code:'REQUEST_ID_REUSED'});
 g=dispatch(g,who,{id:'first-action',gameId:g.id,stepId:sid,command:{type:'act',action:{type:'bite',target:'a'}}});
 g=dispatch(g,mod,{id:'finish',gameId:g.id,stepId:sid,command:{type:'advance'}});
 assert.equal(g.step,'witch');
});

test('more than 300 receipts from other actors cannot turn an old bite replay into a new choice',()=>{
 let g=createGame('replay',[...Array.from({length:6},(_,i)=>({id:'w'+i,name:'W'+i,role:'wolf' as const})),...Array.from({length:8},(_,i)=>({id:'v'+i,name:'V'+i,role:'villager' as const}))]);
 for(const id of ['guard','seer'])g=dispatch(g,mod,{id,gameId:g.id,stepId:stepId(g),command:{type:'advance'}});
 const sid=stepId(g), who={kind:'player',playerId:'w0'} as const;
 g=dispatch(g,who,{id:'wake',gameId:g.id,stepId:sid,command:{type:'wake'}});
 const old={id:'lost-ack',gameId:g.id,stepId:sid,command:{type:'act',action:{type:'bite',target:'v0'}} as const};
 g=dispatch(g,who,old);g=dispatch(g,who,{...old,id:'changed',command:{type:'act',action:{type:'bite',target:'v1'}}});
 for(let w=1;w<6;w++)for(let i=0;i<64;i++)g=dispatch(g,{kind:'player',playerId:'w'+w},{id:'wake-'+i,gameId:g.id,stepId:sid,command:{type:'wake'}});
 assert(Object.keys(g.receipts).length>300);
 assert.deepEqual(dispatch(g,who,old),g);
 assert.equal((g.actions.w0 as {target:string}).target,'v1');
 assert.throws(()=>dispatch(g,who,{...old,command:{type:'act',action:{type:'bite',target:'v2'}}}),{code:'REQUEST_ID_REUSED'});
});

test('lobby flood returns 429; old receipts remain valid and moderator can still add players/deal',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'ma-soi-budget-'));
 const server=createServer(createApiHandler(new RoomService(new FileRoomRepository(directory))));
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});});
 const addr=server.address();assert(addr&&typeof addr!=='string');const url='http://127.0.0.1:'+addr.port+'/api/room';
 const credential=randomBytes(32).toString('hex');
 const post=async(body:unknown)=>{const r=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+credential,'content-type':'application/json'},body:JSON.stringify(body)});return{status:r.status,json:await r.json()};};
 let s=(await post({type:'create',requestId:'create',name:'GM'})).json;const code=s.room.code;
 const old={type:'setDeck',requestId:'first',code,expectedRevision:s.room.revision,roles:['wolf','villager','villager']};
 s=(await post(old)).json;
 let limit=false;
 for(let i=0;i<100;i++){const r=await post({...old,requestId:'edit-'+i,expectedRevision:s.room.revision});if(r.status===429){limit=true;break;}assert.equal(r.status,200);s=r.json;}
 assert(limit);assert.equal((await post(old)).status,200);
 assert.equal((await post({...old,roles:['wolf']})).json.error.code,'REQUEST_ID_REUSED');
 for(let i=0;i<3;i++){const r=await post({type:'addOffline',requestId:'add-'+i,code,expectedRevision:s.room.revision,name:'P'+i});assert.equal(r.status,200);s=r.json;}
 const dealt=await post({type:'start',requestId:'deal',code,expectedRevision:s.room.revision,roles:old.roles});assert.equal(dealt.status,200);
});
