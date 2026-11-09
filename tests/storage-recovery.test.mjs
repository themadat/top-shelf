import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('recovery rotation handles browsers that cannot replace a large stored value in place', () => {
  const values = new Map();
  let rejectedTitle = '';
  const quota = Object.assign(new Error('Temporary replacement quota'), { name: 'QuotaExceededError' });
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem(key, value) {
      if (rejectedTitle && key === 'topShelf.state.v5' && window.LocalApp.storageCodec.parse(value).workspace?.title === rejectedTitle) throw quota;
      if ((key.includes('recovery') || key === 'topShelf.state.v5') && values.has(key) && values.get(key) !== value) throw quota;
      values.set(key, String(value));
    }
  };
  const window = { addEventListener() {}, dispatchEvent() {} };
  const context = vm.createContext({ window, localStorage, sessionStorage: localStorage, navigator: {}, CustomEvent: class {}, Blob, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout });
  for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/books.js', 'core/podcasts.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  window.LocalApp.utils.richTextToPlainText = String; window.LocalApp.utils.sanitizeRichHtml = String;
  for (const file of ['core/state.js', 'core/storage-codec.js', 'core/storage.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  const storage = window.LocalApp.storage;
  assert.equal(storage.saveRecovery('First'), true);
  assert.equal(storage.saveRecovery('Replacement'), true);
  assert.equal(storage.recoveryInfo().reason, 'Replacement');
  storage.load();
  const next = window.LocalApp.utils.clone(storage.getState());
  next.workspace.title = 'GitHub wins';
  storage.replace(next, { saveRecovery: false, overwriteLocal: true });
  assert.equal(window.LocalApp.storageCodec.parse(values.get('topShelf.state.v5')).workspace.title, 'GitHub wins');
  assert.equal(storage.getState().workspace.title, 'GitHub wins');
  const persisted = values.get('topShelf.state.v5');
  rejectedTitle = 'Too large';
  const oversized = window.LocalApp.utils.clone(storage.getState());
  oversized.workspace.title = rejectedTitle;
  assert.throws(() => storage.replace(oversized, { saveRecovery: false, overwriteLocal: true }), /compact form/);
  assert.equal(values.get('topShelf.state.v5'), persisted);
  assert.equal(storage.getState().workspace.title, 'GitHub wins');
});


test('failed replacement preserves live and persisted state and emits no replacement event', () => {
  const values = new Map(), events = [];
  let full = false;
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem(key, value) {
      if (full && key === 'topShelf.state.v5') throw Object.assign(new Error('Full'), { name: 'QuotaExceededError' });
      values.set(key, String(value));
    }
  };
  const window = { addEventListener() {}, dispatchEvent(event) { events.push(event); } };
  const context = vm.createContext({ window, localStorage, sessionStorage: localStorage, navigator: {}, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, Blob, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout });
  for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/books.js', 'core/podcasts.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  window.LocalApp.utils.richTextToPlainText = String; window.LocalApp.utils.sanitizeRichHtml = String;
  for (const file of ['core/state.js', 'core/storage-codec.js', 'core/storage.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  const { storage, utils } = window.LocalApp;
  storage.load();
  const withBooks = utils.clone(storage.getState()); withBooks.workspace.books = [window.LocalApp.books.normalize({ id: 'book-one', title: 'Keep book', notes: 'Personal notes' })];
  storage.replace(withBooks, { saveRecovery: false });
  events.length = 0;
  const original = utils.clone(storage.getState()), persisted = values.get('topShelf.state.v5');
  const next = utils.clone(original); next.workspace.title = 'Cloud replacement';
  full = true;
  assert.throws(() => storage.replace(next), /Current live data was kept/);
  assert.equal(JSON.stringify(storage.getState()), JSON.stringify(original));
  assert.equal(values.get('topShelf.state.v5'), persisted);
  assert.equal(events.filter(e => e.type === 'app:statechange').length, 0);
  assert.equal(storage.recoveryInfo().reason, 'Before data replacement');
  full = false;
  storage.replace(next, { saveRecovery: false });
  assert.equal(storage.getState().workspace.title, 'Cloud replacement');
});

test('async recovery flushes pending saves but still rejects writes from another tab', async () => {
  const values = new Map();
  let finishRecovery;
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, String(value))
  };
  const indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close() {},
          transaction() {
            const transaction = { objectStore: () => ({ put: () => ({}) }) };
            finishRecovery = () => transaction.oncomplete();
            return transaction;
          }
        };
        request.onsuccess();
      });
      return request;
    }
  };
  const window = { addEventListener() {}, dispatchEvent() {}, setTimeout() { return 1; }, clearTimeout() {} };
  const context = vm.createContext({ window, localStorage, sessionStorage: localStorage, indexedDB, navigator: {}, CustomEvent: class {}, Blob, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout });
  for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/books.js', 'core/podcasts.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  window.LocalApp.utils.richTextToPlainText = String; window.LocalApp.utils.sanitizeRichHtml = String;
  for (const file of ['core/state.js', 'core/storage-codec.js', 'core/storage.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  const { storage, config } = window.LocalApp;
  storage.load();
  storage.mutate(state => { state.modules.cloudSync.lastCheckedAt = '2026-11-09T12:00:00.000Z'; }, { touch: false, reason: 'sync-check' });
  const recovery = storage.saveRecoveryAsync('Before downloading GitHub data');
  await Promise.resolve();
  // Simulate the pending autosave firing while IndexedDB commits.
  storage.saveNow();
  finishRecovery();
  assert.equal(await recovery, true);

  const concurrent = storage.saveRecoveryAsync('Concurrent tab');
  await Promise.resolve();
  const other = JSON.parse(values.get(config.storage.stateKey));
  other.workspace.title = 'Changed in another tab';
  values.set(config.storage.stateKey, JSON.stringify(other));
  finishRecovery();
  await assert.rejects(concurrent, /Saved data changed in another tab/);
  assert.equal(JSON.parse(values.get(config.storage.stateKey)).workspace.title, 'Changed in another tab');
});
