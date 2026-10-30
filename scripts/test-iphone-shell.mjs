// Browser integration of the shipped iPhone web bundle with plugin web fallbacks.
// Fresh profile, all HTTPS blocked: no service-worker warmup or live room writes.
// This does not replace physical iPhone camera/storage/status-bar checks.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { preview } from 'vite';
import QRCode from 'qrcode';

const args = process.argv.slice(2);
if (args.length) throw new Error('Dùng npm run test:ios-shell. Cần build:ios trước.');
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
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
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
  await readFile(join(root, 'dist-ios/index.html')); // Require the actual packaged build.
  server = await preview({ root, logLevel: 'error', build: { outDir: 'dist-ios' }, preview: { host: '127.0.0.1', port: 0, open: false } });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const executable = process.env.CHROME_PATH || (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
  chrome = spawn(executable, [`--user-data-dir=${directory}`, '--remote-debugging-port=0',
    '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check',
    '--headless=new', 'about:blank'], { stdio: 'ignore' });
  let launchError;
  chrome.once('error', error => { launchError = error; });
  const port = await until(async () => {
    if (launchError) throw launchError;
    try { return Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch { return false; }
  }, 'Chrome');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const send = await connect(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + expression);
    return result.result.value;
  };
  const wait = expression => until(() => evaluate(expression), expression);
  const click = async selector => {
    await wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const qr = await QRCode.toDataURL('https://masoi.yennhi.tech/?room=012345', { width: 480, margin: 4 });
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const image = new Image(); image.src = ${JSON.stringify(qr)}; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 480;
      canvas.getContext('2d').drawImage(image, 0, 0); window.__qrSource = canvas;
      return canvas.captureStream(10);
    }});
  ` });
  await send('Page.navigate', { url: origin });
  await wait(`document.documentElement.classList.contains('native-app') && !!document.querySelector('#join-name')`);
  assert.equal(await evaluate('localStorage.length'), 0, 'first launch uses a fresh store');
  await evaluate(`document.querySelector('#join-name').value = 'Người thử QR'`);
  await click('[data-action="scan-qr"]');
  await wait(`document.querySelector('#join-code')?.value === '012345' && !document.querySelector('.qr-scanner')`);
  assert.equal(await evaluate(`document.querySelector('#join-name').value`), 'Người thử QR');
  assert.equal(await evaluate('location.origin'), origin, 'QR does not navigate or select an untrusted backend');
  assert.equal(await evaluate('!!document.querySelector("#room-code")'), false, 'scan fills code, never silently joins');
  console.log('QR đạt: đọc hình QR masoi.yennhi.tech qua camera giả lập → điền 012345, giữ tên, đóng camera, không tự join.');

  await click('[data-action="entry-create"]');
  await click('[data-action="toggle-mode"]');
  await click('[data-action="create"]');
  const room = await wait(`document.querySelector('#room-code')?.textContent`);
  assert.match(room, /^\d{6}$/);
  await click('[data-modal="offline-add"]');
  await evaluate(`document.querySelector('#offline-name').value = 'Người offline'`);
  await click('[data-action="add-offline"]');
  await wait(`document.querySelectorAll('.seat').length === 1 && !document.querySelector('#offline-name')`);
  assert.equal(await evaluate(`!!document.querySelector('[data-action="browser-fullscreen"]')`), false);
  // A cold open at / must restore the native saved route, not just a reload URL.
  await send('Page.navigate', { url: origin + '/' });
  await wait(`document.querySelector('#room-code')?.textContent === ${JSON.stringify(room)} && document.querySelectorAll('.seat').length === 1`);
  const images = (await readdir(join(root, 'dist-ios/offline-cards'))).filter(f => f.endsWith('.webp'));
  assert.equal(images.length, 64);
  const decoded = await evaluate(`Promise.all(${JSON.stringify(images)}.map(async name => {
    const image = new Image(); image.src = '/offline-cards/' + name; await image.decode();
    return image.naturalWidth > 0;
  }))`);
  assert.ok(decoded.every(Boolean));
  assert.equal(await evaluate(`navigator.serviceWorker.controller === null`), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  console.log('Offline đạt: bản iOS mở lần đầu khi HTTPS bị chặn, tạo/lưu bàn, mở lại từ / giữ người và bàn, giải mã đủ 64 ảnh cục bộ, không service worker.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await cleanup(); }
