// Explicit live smoke: real production web host + an isolated Release app on a physical iPhone.
// Never uses the user browser profile or the shipping app storage.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';


const args = process.argv.slice(2);
if (process.env.MA_SOI_LIVE_TEST !== '1') throw new Error('Live fixture requires MA_SOI_LIVE_TEST=1; creates only a disposable room.');
const smoke = true;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'ma-soi-tabs-'));
const connections = new Set();
let server, chrome, closing = false, runFile, exitManual=false;

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
  if (runFile) await rm(runFile, { force: true });
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
  const origin = 'https://masoi.yennhi.tech';
  const device = process.env.MA_SOI_DEVICE;
  if (!device) throw new Error('Set MA_SOI_DEVICE to the intended paired physical device.');
  const derived = process.env.MA_SOI_DERIVED_DATA || '/tmp/ma-soi-lifecycle-build';
  const products = join(derived, 'Build/Products');
  const template = (await readdir(products)).find(name => name.startsWith('OnlineLifecycle_') && name.endsWith('.xctestrun'));
  if (!template) throw new Error('Build the OnlineLifecycle scheme for testing first.');
  const executable = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  chrome = spawn(executable, [`--user-data-dir=${directory}`, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--no-first-run', '--no-default-browser-check', '--headless=new', 'about:blank'], { stdio: 'ignore' });
  let launchError; chrome.once('error', error => { launchError = error; });
  const port = await until(async () => {
    if (launchError) throw launchError;
    try { return Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch { return false; }
  }, 'Chrome');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const send = await connect(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error('Web fixture interaction failed');
    return result.result.value;
  };
  const wait = expression => until(() => evaluate(expression), expression);
  const click = async selector => {
    await wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  await send('Page.navigate', { url: origin });
  await click('[data-action="entry-create"]'); await click('[data-action="create"]');
  const code = await wait(`document.querySelector('#room-code')?.textContent`);
  for (const [index, name] of ['Web QA A', 'Web QA B', 'Web QA C'].entries()) {
    await click('[data-modal="offline-add"]');
    await wait(`!!document.querySelector('#offline-name')`);
    await evaluate(`document.querySelector('#offline-name').value=${JSON.stringify(name)}`);
    await click('[data-action="add-offline"]');
    await wait(`document.querySelectorAll('.seat').length===${index+1} && !document.querySelector('#offline-name')`);
  }
  const token = await evaluate(`JSON.parse(localStorage.getItem('ma-soi:sessions:v1'))[${JSON.stringify(code)}].token`);
  if(process.env.MA_SOI_MANUAL_TEST==='1') {
    const read=async()=>{const r=await fetch(origin+'/api/room?code='+code,{headers:{Authorization:'Bearer '+token}});assert.equal(r.status,200);return await r.json();};
    const mutate=async(operation)=>{const r=await fetch(origin+'/api/room',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({code,requestId:crypto.randomUUID(),...operation})});const data=await r.json();if(!r.ok)throw new Error(data.error?.code||'fixture error');return data;};
    const command=async(operation)=>{const s=await read();return mutate({type:'command',stepId:s.game.stepId,command:operation});};
    const status=async()=>{const s=await read();console.log(JSON.stringify({phase:s.room.phase,memberCount:s.room.members.length,nativeMembers:s.room.members.filter(m=>!m.offline&&!m.left).length,ready:s.room.readyPlayerIds.length,step:s.game?.step}));};
    console.log('MANUAL_ROOM '+code+'; join as iPhone QA. Only this disposable fixture is controlled.');
    const lines=createInterface({input:process.stdin});
    for await(const line of lines){try{
      const action=line.trim();
      if(action==='status')await status();
      if(action==='add'){const s=await read();await mutate({type:'addOffline',name:'Web QA D',expectedRevision:s.room.revision});await status();}
      if(action==='deal'){
        await evaluate(`document.querySelector('[data-modal="__close"]')?.click()`);
        await click('[data-modal="tools"]');await click('[data-action="refresh"]');
        await evaluate(`document.querySelector('[data-modal="__close"]')?.click()`);
        const current=await read();await wait(`document.querySelectorAll('.seat').length===${current.room.members.filter(m=>!m.left).length}`);
        await click('[data-modal="deck"]');
        await evaluate(`for(const input of document.querySelectorAll('[data-role]')){input.value=({wolf:1,villager:4})[input.dataset.role]||0;input.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('[data-action="save-deck"]').click()`);
        await wait(`!document.querySelector('.modal')`);await click('[data-action="start"]');await status();
      }
      if(action==='begin'){
        let s=await read();for(const member of s.room.members.filter(m=>m.offline))await mutate({type:'offlineReady',playerId:member.id});
        await click('[data-modal="tools"]');await click('[data-action="refresh"]');await evaluate(`document.querySelector('[data-modal="__close"]')?.click()`);await click('[data-action="begin"]');await status();
      }
      if(action==='night'){
        for(let n=0;n<45;n++){
          let s=await read();if(['review','day','ended'].includes(s.game.step))break;
          const pending=s.game.progress.filter(p=>!p.submitted);
          if(pending.some(p=>!s.room.members.find(m=>m.id===p.id)?.offline)){console.log('NATIVE_ACTION_REQUIRED: wake, pick a Web QA player, then confirm on iPhone.');break;}
          for(const actor of pending){
            await mutate({type:'offlineCommand',playerId:actor.id,stepId:s.game.stepId,command:{type:'wake'}});
            const target=s.game.players.find(p=>p.alive&&p.role!=='wolf'&&s.room.members.find(m=>m.id===p.id)?.offline);
            await mutate({type:'offlineCommand',playerId:actor.id,stepId:s.game.stepId,command:{type:'act',action:{type:'bite',target:target.id}}});
          }
          s=await read();await command({type:'advance'});
        }await status();
      }
      if(action==='publish'){let s=await read();if(!s.game.resolved)await command({type:'resolve'});await command({type:'publish'});await status();}
      if(action==='end'){
        const s=await read();const wolf=s.game.players.find(p=>p.role==='wolf');
        const op={type:'command',stepId:s.game.stepId,requestId:crypto.randomUUID(),command:{type:'verdict',target:wolf.id}};
        const a=await mutate(op);await mutate(op);const b=await read();assert.equal(a.room.revision,b.room.revision);
        console.log('RETRY_IDEMPOTENT: true');await status();
      }
      if(action==='finish'){await status();lines.close();break;}
    }catch(e){console.log('FIXTURE_ERROR '+e.message);}}
    exitManual=true;
  }
  if(exitManual) { await cleanup(); process.exit(0); }
  const fixture = join(directory, 'fixture.json');
  await writeFile(fixture, JSON.stringify({ MA_SOI_TEST_ROOM: code, MA_SOI_TEST_HOST_TOKEN: token }), { mode: 0o600 });
  runFile = join(products, '.OnlineLifecycle-live.xctestrun');
  const prepare = spawn('python3', ['-c', `
import sys,json,plistlib,os
p=plistlib.load(open(sys.argv[1],'rb')); env=json.load(open(sys.argv[2]))
def visit(x):
 if isinstance(x,dict):
  if x.get('IsUITestBundle'):
   x.setdefault('EnvironmentVariables',{}).update(env)
  for value in x.values():visit(value)
 elif isinstance(x,list):
  for value in x:visit(value)
visit(p)
with open(sys.argv[3],'wb') as f:plistlib.dump(p,f)
os.chmod(sys.argv[3],0o600)
`, join(products, template), fixture, runFile], { stdio: ['ignore','ignore','pipe'] });
  await new Promise((resolve, reject) => prepare.once('exit', status => status === 0 ? resolve() : reject(new Error('Could not prepare private test environment'))));
  console.log('Web fixture ready; starting physical-iPhone XCTest (isolated app, Release).');
  const resultPath = '/tmp/ma-soi-physical-online-' + Date.now() + '.xcresult';
  const runner = spawn('xcodebuild', ['test-without-building','-xctestrun',runFile,'-destination','id='+device,
    '-resultBundlePath', resultPath, '-parallel-testing-enabled','NO'], { stdio: ['ignore','pipe','pipe'] });
  let output=''; const stages=new Set();
  const receive = chunk => {
    output += chunk.toString();
    for (const match of output.matchAll(/LIFECYCLE: ([^\r\n]+)/g)) {
      if (!stages.has(match[1])) { stages.add(match[1]); console.log('Native: '+match[1]); }
    }
  };
  runner.stdout.on('data', receive); runner.stderr.on('data', receive);
  const status = await new Promise(resolve => runner.once('exit', resolve));
  // Keep raw XCTest output private; never publish a native request capability.
  await writeFile('/tmp/ma-soi-physical-online-private.log', output.replaceAll(token, '[REDACTED]'), { mode:0o600 });
  if (status !== 0) {
    console.log(output.split('\n').filter(line=>/error:|failed|Testing failed|could not|Unable to/i.test(line)).slice(-12).join('\n').replaceAll(token,'[REDACTED]'));
    throw new Error('Physical XCTest failed; see private local diagnostics.');
  }
  await click('[data-modal="tools"]'); await click('[data-action="refresh"]');
  await evaluate(`document.querySelector('[data-modal="__close"]')?.click()`);
  await wait(`document.querySelector('.table')?.textContent.includes('Kết thúc')`);
  assert.ok(stages.has('full-game-ended-retry-idempotent'));
  const report={date:new Date().toISOString(),target:'production web + isolated Release app on physical iPhone',
    stages:[...stages],webObservedEnded:true,exitCode:status,
    limits:['Hardware lock/unlock still requires a manual physical step; XCTest has no public lock-button API.',
      'Resume milliseconds include XCTest activation and accessibility lookup; they are not a frame-rate measurement.']};
  await writeFile(join(root,'docs/verification/iphone-online-lifecycle.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS: real web sees the same ended game; native identity survived background and cold launch; identical retry did not change revision.');
} catch(error) {
  console.error(error.message); process.exitCode=1;
} finally { await cleanup(); }
