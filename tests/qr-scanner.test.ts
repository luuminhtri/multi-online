import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { roomCodeFromQr } from '../src/online/qr-scanner.ts';

test('QR phòng nhận đúng URL cùng app hoặc mã sáu số, từ chối link khác', () => {
  const origin = 'https://multi-online.vercel.app';
  assert.equal(roomCodeFromQr(`${origin}/?room=012345`, origin), '012345');
  assert.equal(roomCodeFromQr('012345', origin), '012345');
  for (const value of ['https://example.com/?room=012345', `${origin}/?room=123`, 'javascript:alert(1)', '']) {
    assert.equal(roomCodeFromQr(value, origin), null);
  }
});

test('QR tên miền riêng và Vercel được nhận chéo, không mở rộng sang tên miền giả hoặc server local', () => {
  const vercel = 'https://multi-online.vercel.app', custom = 'https://masoi.yennhi.tech';
  assert.equal(roomCodeFromQr(`${custom}/?room=012345`, vercel), '012345');
  assert.equal(roomCodeFromQr(`${vercel}/?room=012345`, custom), '012345');
  for (const url of ['https://masoi.yennhi.tech.evil.example/?room=012345', 'http://masoi.yennhi.tech/?room=012345', 'https://user@masoi.yennhi.tech/?room=012345', 'http://192.168.1.2:5174/?room=012345']) {
    assert.equal(roomCodeFromQr(url, vercel), null);
  }
  assert.equal(roomCodeFromQr(`${custom}/?room=012345`, 'http://127.0.0.1:5174'), null);
});

test('decoder đọc được QR do quản trò tạo', () => {
  const text = 'https://multi-online.vercel.app/?room=012345';
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const scale = 6, margin = 4, size = (qr.modules.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / scale) - margin, col = Math.floor(x / scale) - margin;
    if (row >= 0 && col >= 0 && row < qr.modules.size && col < qr.modules.size && qr.modules.get(row, col)) {
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
    }
  }
  assert.equal(jsQR(pixels, size, size)?.data, text);
});
