import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const window = { LocalApp: {} };
vm.runInNewContext(readFileSync(new URL('../assets/js/core/storage-codec.js', import.meta.url), 'utf8'), { window, TextEncoder, TextDecoder });
const codec = window.LocalApp.storageCodec;
test('compact storage preserves unicode, escapes and legacy JSON', () => {
  const value = { notes: '🎬 café 中文\n "quoted" \\ \u0000', rows: Array.from({ length: 200 }, (_, id) => ({ id, title: 'A movie', review: 'Some personal notes. '.repeat(100) })) };
  const json = JSON.stringify(value), packed = codec.encode(json);
  assert.ok(packed.length < json.length / 3);
  assert.equal(JSON.stringify(codec.parse(packed)), json);
  assert.equal(JSON.stringify(codec.parse(json)), json);
});
test('dictionary resets preserve varied large content and malformed payloads fail', () => {
  let seed = 17, text = '';
  for (let i = 0; i < 300000; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; text += String.fromCharCode(32 + seed % 90); }
  const json = JSON.stringify({ text }), packed = codec.encode(json);
  assert.equal(JSON.stringify(codec.parse(packed)), json);
  const envelope = JSON.parse(packed);
  envelope.data = envelope.data.slice(0, -1);
  assert.throws(() => codec.parse(JSON.stringify(envelope)), /compact library/);
  envelope.data = String.fromCharCode(33023);
  assert.throws(() => codec.parse(JSON.stringify(envelope)), /compact library/);
});
