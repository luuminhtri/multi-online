// A temporary Chrome window, one host and six independent debug tabs. Node >=22.18.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'vite';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--smoke')) throw new Error('Dùng npm run test:players hoặc thêm -- --smoke để kiểm tra không hiện cửa sổ.');
const smoke = true;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = await mkdtemp(join(tmpdir(), 'ma-soi-tabs-'));
const connections = new Set();
let server, chrome, closing = false;

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
  await server?.close();
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
  // Own debug server: never reuse a production/cloud endpoint or a user's room.
  server = await createServer({ root, mode: 'debug', logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const executable = process.env.CHROME_PATH || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome');
  let launchError;
  chrome = spawn(executable, [
    `--user-data-dir=${directory}`, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', ...(smoke ? ['--headless=new'] : []), 'about:blank',
  ], { stdio: 'ignore' });
  chrome.once('error', error => { launchError = error; });
  const port = await until(async () => {
    if (launchError) throw new Error('Không mở được Chrome. Cài Chrome hoặc đặt CHROME_PATH.');
    if (chrome.exitCode !== null) throw new Error('Chrome đã thoát trước khi sẵn sàng.');
    try { return Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch { return false; }
  }, 'Chrome khởi động');
  const endpoint = `http://127.0.0.1:${port}`;
  const browser = await connect((await (await fetch(`${endpoint}/json/version`)).json()).webSocketDebuggerUrl);
  const initial = (await (await fetch(`${endpoint}/json/list`)).json()).find(p => p.type === 'page');

  async function page(targetId) {
    const info = await until(async () => (await (await fetch(`${endpoint}/json/list`)).json()).find(p => p.id === targetId), 'tab mới');
    const send = await connect(info.webSocketDebuggerUrl);
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
      if (result.exceptionDetails) throw new Error('Thao tác trong tab thất bại.');
      return result.result.value;
    };
    const wait = expression => until(() => evaluate(expression), 'giao diện phòng');
    return { send, evaluate, wait, targetId };
  }
  const host = await page(initial.id);
  await host.send('Page.navigate', { url: origin });
  await host.wait(`!!document.querySelector('[data-action="entry-create"]') && !document.querySelector('[data-action="entry-create"]').disabled`);
  await host.evaluate(`document.querySelector('[data-action="entry-create"]').click()`);
  await host.evaluate(`(() => {
    const original=window.fetch.bind(window);
    const gate=new Promise(resolve=>window.__releaseAck=resolve);
    window.__writes=[];
    window.__createWidth=document.querySelector('[data-action="create"]').getBoundingClientRect().width;
    window.fetch=async (...args)=>{
      const post=args[1]?.method==='POST';
      if(post) window.__writes.push(args[1].body);
      const response=await original(...args);
      if(post && window.__writes.length===1){await gate; throw new TypeError('Simulated lost acknowledgement');}
      return response;
    };
    document.querySelector('[data-action="create"]').click();
  })()`);
  await host.wait(`!!document.querySelector('[data-action="create"][aria-busy="true"]')`);
  assert.equal(await host.evaluate(`document.querySelectorAll('.notice').length`),0,'ordinary sending stays quiet');
  assert.equal(await host.evaluate(`(() => {const spinner=document.querySelector('.create-spinner'); if(!spinner)return false; const r=spinner.getBoundingClientRect(); return Math.abs(r.x+r.width/2-innerWidth/2)<2 && Math.abs(r.y+r.height/2-innerHeight/2)<2;})()`),true,'create spinner centered in viewport');
  assert.equal(await host.evaluate(`document.querySelector('[data-action="create"]').getBoundingClientRect().width===window.__createWidth`),true,'loading keeps button width');
  await host.evaluate(`window.__releaseAck()`);
  await host.wait(`!!document.querySelector('[data-action="retry"]')`);
  assert.equal(await host.evaluate(`document.querySelectorAll('.notice').length`),1,'lost ACK has one actionable message');
  await host.evaluate(`document.querySelector('[data-action="retry"]').click()`);
  const room = await host.wait(`document.querySelector('#room-code')?.textContent`);
  assert.match(room, /^\d{6}$/);
  assert.equal(await host.evaluate(`window.__writes.length===2 && window.__writes[0]===window.__writes[1] && !document.querySelector('[aria-busy="true"]')`),true,'retry keeps the original request and clears loading');
  await host.evaluate(`document.title = ${JSON.stringify(`Quản trò · ${room}`)}`);
  const tabs = [host];
  for (const name of 'ABCDEF') {
    const { targetId } = await browser('Target.createTarget', { url: `${origin}/?room=${room}`, newWindow: false });
    const player = await page(targetId);
    await player.wait(`!!document.querySelector('#join-name') && !document.querySelector('[data-action="join"]').disabled`);
    await player.evaluate(`document.querySelector('#join-name').value = ${JSON.stringify(name)}; document.querySelector('[data-action="join"]').click()`);
    await player.wait(`document.querySelector('#room-code')?.textContent === ${JSON.stringify(room)}`);
    await player.evaluate(`document.title = ${JSON.stringify(`${name} · ${room}`)}`);
    tabs.push(player);
  }
  // Check rendered identities, independent storage, one window, and reload recovery.
  const identities = [], windows = [];
  for (const [index, tab] of tabs.entries()) {
    windows.push((await browser('Browser.getWindowForTarget', { targetId: tab.targetId })).windowId);
    const before = await tab.evaluate(`sessionStorage.getItem('ma-soi:sessions:v1')`);
    assert.ok(before);
    identities.push(JSON.parse(before)[room].token);
    assert.equal(await tab.evaluate(`localStorage.getItem('ma-soi:sessions:v1')`), null);
    if (index > 0) {
      await tab.evaluate('window.__beforeTestReload = true');
      await tab.send('Page.reload');
      await tab.wait(`!window.__beforeTestReload && document.querySelector('#room-code')?.textContent === ${JSON.stringify(room)}`);
      assert.equal(await tab.evaluate(`sessionStorage.getItem('ma-soi:sessions:v1')`), before);
    }
    const expected = index === 0 ? 'QUẢN TRÒ' : 'ABCDEF'[index - 1];
    assert.equal(await tab.evaluate(`document.querySelector('.room-identity .eyebrow')?.textContent`), expected);
    await tab.evaluate(`document.title = ${JSON.stringify(`${expected} · ${room}`)}`);
  }
  assert.equal(new Set(identities).size, 7);
  assert.equal(new Set(windows).size, 1);
  await host.evaluate(`document.querySelector('[data-modal="tools"]').click();document.querySelector('[data-action="refresh"]').click();document.querySelector('[data-modal="__close"]').click()`);
  await host.wait(`document.querySelectorAll('.seat').length >= 6`);
  await browser('Target.activateTarget', { targetId: host.targetId });
  console.log(`Phòng ${room}: 1 tab quản trò + 6 tab A–F, cùng cửa sổ, phiên riêng; tải lại vẫn đúng người.`);

  await host.evaluate(`if (!document.querySelector('[data-action="browser-fullscreen"]')) document.querySelector('[data-modal="tools"]').click();document.querySelector('[data-action="browser-fullscreen"]').click()`);
  await host.wait(`!!document.fullscreenElement`);
  await host.evaluate(`if (!document.querySelector('[data-action="browser-fullscreen"]')) document.querySelector('[data-modal="tools"]').click();document.querySelector('[data-action="browser-fullscreen"]').click()`);
  await host.wait(`!document.fullscreenElement`);
  await host.evaluate(`Object.defineProperty(document,'fullscreenEnabled',{value:false,configurable:true});document.querySelector('[data-action="browser-fullscreen"]').click()`);
  await host.wait(`document.querySelector('.modal-body')?.textContent.includes('Thêm vào Màn hình chính')`);
  await host.evaluate(`delete document.fullscreenEnabled;document.querySelector('[data-modal="__close"]').click()`);
  await host.evaluate(`document.querySelector('[data-action="invite-qr"]').click()`);
  await host.wait(`!!document.querySelector('.invite-qr svg')`);
  assert.equal(await host.evaluate(`document.querySelector('.qr-room-code').textContent`), room);
  await host.evaluate(`document.querySelector('[data-modal="__close"]').click()`);
  // UI regression coverage against seven isolated clients in ephemeral RAM.
  const readSource = `async () => {
    const code = document.querySelector('#room-code').textContent;
    const token = JSON.parse(sessionStorage.getItem('ma-soi:sessions:v1'))[code].token;
    return (await fetch('/api/room?code='+code, {headers:{Authorization:'Bearer '+token}})).json();
  }`;
  const read = tab => tab.evaluate(`(${readSource})()`);
  const click = (tab, selector) => tab.evaluate(`if (!document.querySelector(${JSON.stringify(selector)}) && document.querySelector('[data-modal="tools"]')) document.querySelector('[data-modal="tools"]').click();document.querySelector(${JSON.stringify(selector)}).click();if (${JSON.stringify(selector)}.includes('refresh')) document.querySelector('[data-modal="__close"]')?.click()`);
  const p = tabs[1];
  await p.send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await host.evaluate(`document.querySelector('[data-modal="deck"]').click(); for(const input of document.querySelectorAll('[data-role]')) {input.value=({wolf:2,seer:1,guard:1,villager:2})[input.dataset.role]||0; input.dispatchEvent(new Event('input',{bubbles:true}));} document.querySelector('[data-action="save-deck"]').click()`);
  await host.wait(`!document.querySelector('.modal')`);
  await click(p, '[data-action="refresh"]');
  await p.wait(`!!document.querySelector('.setup-panel [data-modal="role:wolf"]')`);
  await p.evaluate(`window.__table=document.querySelector('.table'); window.__seat=document.querySelector('.seat'); document.querySelector('.setup-panel [data-modal="role:wolf"]').click()`);
  await p.wait(`document.querySelector('.card-img')?.complete && document.querySelector('.card-img')?.naturalWidth > 0`);
  await click(p, '[data-modal="__close"]');
  assert.equal(await p.evaluate(`!document.querySelector('.modal')`), true, 'inline lobby role closes directly');
  assert.equal(await p.evaluate(`window.__table===document.querySelector('.table') && window.__seat===document.querySelector('.seat')`), true, 'table DOM retained');
  const width = await p.evaluate(`document.querySelector('.table').getBoundingClientRect().width`);
  await p.send('Emulation.setDeviceMetricsOverride', {width:390,height:650,deviceScaleFactor:1,mobile:true});
  assert.equal(await p.evaluate(`document.querySelector('.table').getBoundingClientRect().width`), width, 'height changes do not resize table');
  assert.equal(await p.evaluate(`getComputedStyle(document.querySelector('header')).display`), 'none');
  assert.equal(await p.evaluate(`document.querySelector('.room-tools').getBoundingClientRect().right <= document.querySelector('.room-identity').getBoundingClientRect().left`),true,'tools left, room ID right');
  assert.equal(await p.evaluate(`document.querySelectorAll('.room-tools button').length === 2 && !!document.querySelector('.room-tools [data-modal="tools"]') && !!document.querySelector('.room-tools [data-modal="catalog"]')`),true,'toolbar only shows settings and roles');
  await click(p, '[data-action="table-fullscreen"]');
  assert.equal(await p.evaluate(`(() => {const button=document.querySelector('[data-action="table-fullscreen"]');const r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button && button.getAttribute('aria-label')==='Thu nhỏ bàn chơi' && !document.fullscreenElement;})()`),true,'table restore button is unobscured and independent of browser fullscreen');
  assert.equal(await p.evaluate(`getComputedStyle(document.querySelector('.table-stage')).position`), 'fixed');
  await click(p, '[data-action="table-fullscreen"]');
  await click(host, '[data-action="start"]');
  for(const tab of tabs.slice(1)) {
    await click(tab, '[data-action="refresh"]');
    await tab.wait(`!!document.querySelector('#role-overlay')`);
    await click(tab, '[data-action="role-read"]');
    await tab.wait(`!document.querySelector('#role-overlay')`);
  }
  await click(host, '[data-action="refresh"]');
  await host.wait(`!!document.querySelector('[data-action="begin"]:not(:disabled)')`);
  await click(host, '[data-action="begin"]');
  const identitiesByRole = [];
  for(const tab of tabs.slice(1)) {const s = await read(tab); identitiesByRole.push({tab,id:s.me.id,role:s.game.self.role});}
  const wolfId = identitiesByRole.find(p=>p.role==='wolf').id;
  let checkedChat=false, checkedSeer=false, checkedTurn=false;
  for(let i=0;i<25;i++) {
    const hostState=await read(host);
    if(hostState.game.step==='review') break;
    for(const {tab,role} of identitiesByRole) {
      await click(tab, '[data-action="refresh"]');
      const s=await read(tab);
      if(!s.game.turn) continue;
      await tab.wait(`!!document.querySelector('[data-action="wake"]:not(:disabled)')`);
      await click(tab, '[data-action="wake"]');
      await tab.wait(`!!document.querySelector('.turn-instruction')`);
      checkedTurn=true;
      if(role==='wolf') {
        await click(tab, '[data-modal="packchat"]');
        await tab.wait(`!!document.querySelector('.chat-fullscreen #chat-text')`);
        assert.equal(await tab.evaluate(`Math.round(document.querySelector('.chat-fullscreen').getBoundingClientRect().height)===innerHeight`),true);
        await tab.evaluate(`document.querySelector('#chat-text').value='Tin nhắn kiểm thử';document.querySelector('[data-action="chat-send"]').click()`);
        await tab.wait(`document.querySelector('.chat-messages').textContent.includes('Tin nhắn kiểm thử')`);
        await click(tab,'[data-modal="__close"]'); checkedChat=true;
      }
      const target=role==='seer'?wolfId:s.game.turn.targets.find(id=>!identitiesByRole.some(p=>p.id===id&&p.role==='wolf'));
      await click(tab, `[data-action="pick-target"][data-player-id="${target}"]`);
      await click(tab, '[data-action="submit"]');
      if(role==='seer') {
        await tab.wait(`!!document.querySelector('.inspect-verdict')`);
        assert.equal(await tab.evaluate(`document.querySelector('.inspect-verdict').textContent`),'Là phe Sói');
        assert.equal(await tab.evaluate(`!!document.querySelector('.inspect-illustration .wolf-emblem') && !document.querySelector('.inspect-illustration img')`), true, 'faction symbol never uses a role card');
        await click(tab,'[data-action="inspect-ack"]'); checkedSeer=true;
      }
    }
    await click(host,'[data-action="refresh"]');
    await host.wait(`!!document.querySelector('[data-action="advance"]:not(:disabled)')`);
    await click(host,'[data-action="advance"]');
    await until(async()=> (await read(host)).game.step!==hostState.game.step,'next night step');
  }
  assert.ok(checkedChat&&checkedSeer&&checkedTurn);
  assert.equal(await p.evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,'no mobile overflow');
  await click(p,'[data-action="exit-room"]');
  await click(p,'[data-action="cancel-exit"]');
  assert.equal((await read(p)).me.name, 'A');
  await click(p,'[data-action="exit-room"]');
  await click(p,'[data-action="confirm-leave"]');
  await p.wait(`!!document.querySelector('#join-name') && !document.querySelector('#room-code')`);
  assert.equal(await p.evaluate(`document.querySelector('#join-name').value`),'A','player name remembered after leave');
  assert((await read(host)).room.members.find(m=>m.name==='A').left,'player permanently left');

  console.log('UI đạt: đóng vai trực tiếp; giữ DOM bàn/ghế; bàn ổn định 390px; ẩn header; toàn màn hình; nhận vai/ready/wake; chọn avatar; chat; soi phe Sói có biểu tượng riêng.');

} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await cleanup(); }
