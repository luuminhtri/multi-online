// macOS, Node >=22.18. Uses installed Chrome; no packages to install.
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { setTimeout as delay } from 'node:timers/promises';

const input = createInterface({ input: process.stdin, output: process.stdout });
const room = (process.argv[2] || await input.question('Nhập mã phòng: ')).trim().toUpperCase();
input.close();
if (!/^[A-Z2-9]{6}$/.test(room)) throw new Error('Mã phòng phải gồm 6 chữ hoặc số từ 2–9.');
if (process.platform !== 'darwin') throw new Error('Script này dành cho Chrome trên macOS.');
const origin = 'http://127.0.0.1:5174';
try {
  const response = await fetch(`${origin}/api/room?config=1`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error();
} catch { throw new Error('Chưa kết nối được server. Chạy npm run dev:online trước.'); }

async function debugPort(directory) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const port = Number((await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      if (port > 0 && (await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) })).ok) return port;
    } catch {}
    await delay(100);
  }
  throw new Error('Chrome chưa sẵn sàng. Đóng cửa sổ test lỗi rồi chạy lại.');
}

async function evaluate(socketUrl, expression) {
  const socket = new WebSocket(socketUrl);
  return new Promise((resolve, reject) => {
    const finish = (error, value) => {
      clearTimeout(timer); socket.close(); error ? reject(error) : resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('Chrome không phản hồi.')), 15000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })), { once: true });
    socket.addEventListener('error', () => finish(new Error('Không kết nối được cửa sổ Chrome.')), { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id !== 1) return;
      if (message.error || message.result?.exceptionDetails) finish(new Error('Không khởi tạo được phiên người chơi.'));
      else finish(null, message.result.result.value);
    });
  });
}

let failures = 0;
for (const name of 'ABCDEFGH') {
  try {
    const directory = join(homedir(), 'Library', 'Application Support', 'MaSoi-TestPlayers', name);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
      `--user-data-dir=${directory}`, '--remote-debugging-port=0',
      '--no-first-run', '--no-default-browser-check',
    ], { detached: true, stdio: 'ignore' });
    chrome.on('error', () => {}); chrome.unref();
    const port = await debugPort(directory), endpoint = `http://127.0.0.1:${port}`;
    const pages = await (await fetch(`${endpoint}/json/list`)).json();
    let page = pages.find(p => p.type === 'page' && p.url.startsWith(origin + '/'));
    if (!page) page = await (await fetch(`${endpoint}/json/new?${encodeURIComponent(origin + '/')}`, { method: 'PUT' })).json();
    // Wait for the page to reach our origin before accessing its storage.
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(page.webSocketDebuggerUrl, `location.origin === ${JSON.stringify(origin)} && document.readyState !== 'loading'`)) { ready = true; break; }
      await delay(100);
    }
    if (!ready) throw new Error('Trang chưa tải xong.');
    const result = await evaluate(page.webSocketDebuggerUrl, `(async () => {
      const key = 'ma-soi:sessions:v1', room = ${JSON.stringify(room)}, name = ${JSON.stringify(name)};
      const sessions = JSON.parse(localStorage.getItem(key) || '{}');
      const random = () => [...crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2, '0')).join('');
      const token = sessions[room]?.token || random();
      const response = await fetch('/api/room', {method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer ' + token}, body:JSON.stringify({type:'join', code:room, name, requestId:random()})});
      const data = await response.json();
      if (!response.ok) return {ok:false, message:data.error?.message || 'Không vào được phòng.'};
      sessions[room] = {token}; localStorage.setItem(key, JSON.stringify(sessions));
      return {ok:true, name:data.me.name};
    })()`);
    if (!result.ok) throw new Error(result.message);
    await evaluate(page.webSocketDebuggerUrl, `location.href = ${JSON.stringify(`${origin}/?room=${room}`)}; true`);
    console.log(`${name}: đã vào phòng ${room} (${result.name}).`);
  } catch (error) { failures++; console.error(`${name}: ${error.message}`); }
}
if (failures) {
  console.error('Dùng phòng đang chờ và chưa có tên A–H. Chạy lại script giữ phiên cũ; không dùng cửa sổ ẩn danh.');
  process.exitCode = 1;
} else console.log('Đã mở đủ 8 phiên A–H. Có thể đóng và chạy lại để tiếp tục cùng phiên.');
