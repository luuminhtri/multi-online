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
const smoke = args.includes('--smoke');
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
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
  await host.evaluate(`document.querySelector('[data-action="create"]').click()`);
  const room = await host.wait(`document.querySelector('#room-code')?.textContent`);
  assert.match(room, /^\d{6}$/);
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
  await host.evaluate(`document.querySelector('[data-action="refresh"]').click()`);
  await host.wait(`document.querySelectorAll('.seat').length >= 6`);
  await browser('Target.activateTarget', { targetId: host.targetId });
  console.log(`Phòng ${room}: 1 tab quản trò + 6 tab A–F, cùng cửa sổ, phiên riêng; tải lại vẫn đúng người.`);
  if (!smoke) {
    console.log('Chọn bộ vai và chia vai trên tab quản trò. Ctrl+C để đóng bộ thử và xóa dữ liệu tạm.');
    await new Promise(resolve => { chrome.once('exit', resolve); if (chrome.exitCode !== null || chrome.signalCode !== null) resolve(); });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await cleanup(); }
