// Browser integration of the shipped iPhone web bundle with plugin web fallbacks.
// Deterministic transport interruptions against the real local room service, isolated RAM.
// This does not replace physical iPhone camera/storage/status-bar checks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:http';
import { createApiHandler } from '../src/server/http.ts';
import { RoomService } from '../src/server/rooms.ts';
import { DebugRoomRepository } from '../src/server/debug-rooms.ts';
import { randomBytes } from 'node:crypto';

const args = process.argv.slice(2);
if (args.length) throw new Error('Dùng npm run test:ios-reconnect. Cần build:ios trước.');
const smoke = true;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'ma-soi-tabs-'));
const connections = new Set();
let server, chrome, closing = false, inspect;
const service = new RoomService(new DebugRoomRepository());

async function cleanup() {
  if (closing) return;
  closing = true;
  for (const socket of connections) socket.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    await new Promise(resolve => {
      const force = setTimeout(() => chrome.kill('SIGKILL'), 3000);
      chrome.once('exit', () => { clearTimeout(force); resolve(); });
      chrome.kill('SIGTERM');
    });
  }
  service.dispose();
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.once('SIGINT', () => { void cleanup(); });
process.once('SIGTERM', () => { void cleanup(); });

async function until(check, label) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && !closing) {
    const result = await check();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Hết thời gian chờ: ${label}.`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  connections.add(socket);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let sequence = 0;
  const waiting = new Map();
  socket.addEventListener('close', () => {
    connections.delete(socket);
    for (const { reject } of waiting.values()) reject(new Error('Chrome đã đóng kết nối.'));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data), handler = waiting.get(message.id);
    if (!handler) return;
    waiting.delete(message.id);
    message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result);
  });
  return async (method, params = {}) => {
    const id = ++sequence;
    let timer;
    try {
      return await new Promise((resolve, reject) => {
        timer = setTimeout(() => { waiting.delete(id); reject(new Error(`Chrome không phản hồi: ${method}`)); }, 15000);
        waiting.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    } finally { clearTimeout(timer); }
  };
}

try {
  const apiHandler=createApiHandler(service);
  server=createServer(async(req,res)=>{
    if(req.url.startsWith('/api/room')) { await apiHandler(req,res); return; }
    const path=new URL(req.url,'http://localhost').pathname;
    try {
      const file=join(root,'dist-ios',path==='/'?'index.html':path);
      const body=await readFile(file);
      const type=path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.webp')?'image/webp':path.endsWith('.png')?'image/png':'text/html';
      res.writeHead(200,{'Content-Type':type});res.end(body);
    } catch {res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const hostToken=randomBytes(32).toString('hex');
  const call=async(body,code)=>{
    const response=await fetch(origin+'/api/room'+(body?'':'?code='+code),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+hostToken,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({requestId:randomBytes(32).toString('hex'),...body}):undefined});
    assert.equal(response.status,200);return await response.json();
  };
  let host=await call({type:'create',name:'QA host'}); const code=host.room.code;
  const executable=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  chrome=spawn(executable,[`--user-data-dir=${directory}`,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','--headless=new','about:blank'],{stdio:'ignore'});
  const port=await until(async()=>{try{return Number((await readFile(join(directory,'DevToolsActivePort'),'utf8')).split('\n')[0]);}catch{return false;}},'Chrome');
  const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const send=await connect(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error('Browser operation failed');return r.result.value;};
  const wait=expression=>until(()=>evaluate(expression),expression);
  inspect=evaluate;
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const originalFetch=window.fetch.bind(window);
    window.__writes=[];window.__statuses=[];window.__reads=0;
    window.fetch=async(url,options={})=>{
      const source=String(url);
      if(!source.includes('/api/room'))return originalFetch(url,options);
      const path='/api/room'+(source.split('/api/room')[1]||'');
      const op=options.body?JSON.parse(options.body):null;
      if(op)window.__writes.push({type:op.type,requestId:op.requestId});else window.__reads++;
      const response=await originalFetch(path,options);window.__statuses.push({type:op?.type,status:response.status});
      if(op?.type==='join'&&window.__holdJoin){window.__holdJoin=false;window.__joinCommitted=true;await new Promise(resolve=>window.__releaseJoin=resolve);throw new TypeError('Lost ACK');}
      if(!op&&path.includes('code=')&&window.__holdRead){window.__holdRead=false;window.__readHeld=true;await new Promise(resolve=>window.__releaseRead=resolve);}
      return response;
    };
  `});
  await send('Page.navigate',{url:origin});
  await wait(`!!document.querySelector('#join-name')`);
  await evaluate(`document.querySelector('#join-code').value=${JSON.stringify(code)};document.querySelector('#join-name').value='Native QA';window.__holdJoin=true;document.querySelector('[data-action="join"]').click()`);
  await wait('window.__joinCommitted===true');
  const setActive=active=>evaluate(`Object.defineProperty(document,'hidden',{value:${!active},configurable:true});document.dispatchEvent(new Event('visibilitychange'))`);
  await setActive(false); await setActive(true);
  await evaluate('window.__releaseJoin()');
  await wait(`document.querySelector('#room-code')?.textContent===${JSON.stringify(code)}`);
  const writes=await evaluate('window.__writes.filter(x=>x.type==="join")');
  assert.equal(writes.length,2);assert.equal(writes[0].requestId,writes[1].requestId);
  host=await call(undefined,code);assert.equal(host.room.members.length,1);
  console.log('PASS lost ACK: foreground during pending join automatically retries the SAME request ID once, with one member and no re-entry.');

  // Hold an old read across a background/foreground cycle; a newer state wins.
  await evaluate('window.__holdRead=true');
  await wait('window.__readHeld===true');
  await setActive(false);
  host=await call({type:'addOffline',code,name:'Arrived while away',expectedRevision:host.room.revision});
  await setActive(true);
  await wait(`document.querySelectorAll('.seat').length===2`);
  await evaluate('window.__releaseRead()');
  await delay(300);
  assert.equal(await evaluate(`document.querySelectorAll('.seat').length`),2);
  console.log('PASS stale read: a pre-background response cannot replace a newer foreground snapshot.');
  const before=await evaluate('window.__reads');
  await setActive(false);await delay(1800);
  assert.equal(await evaluate('window.__reads'),before);
  await setActive(true);
  await wait(`window.__reads>${before}`);
  console.log('PASS background: room polling stops while inactive and restarts immediately on return.');
} catch(error){console.error(error.message);if(inspect)console.error(JSON.stringify(await inspect(`({notice:document.querySelector('.notice')?.textContent,statuses:window.__statuses,writes:window.__writes?.map(x=>x.type),text:document.body.textContent.slice(-400)})`)));process.exitCode=1;}finally{await cleanup();}
