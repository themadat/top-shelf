import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('recovery rotation handles browsers that cannot replace a large stored value in place', () => {
  const values = new Map();
  const quota = Object.assign(new Error('Temporary replacement quota'), { name: 'QuotaExceededError' });
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem(key, value) {
      if (key.includes('recovery') && values.has(key) && values.get(key) !== value) throw quota;
      values.set(key, String(value));
    }
  };
  const window = { addEventListener() {}, dispatchEvent() {} };
  const context = vm.createContext({ window, localStorage, sessionStorage: localStorage, navigator: {}, CustomEvent: class {}, Blob, TextEncoder, structuredClone, setTimeout, clearTimeout });
  for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/books.js', 'core/podcasts.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  window.LocalApp.utils.richTextToPlainText = String; window.LocalApp.utils.sanitizeRichHtml = String;
  for (const file of ['core/state.js', 'core/storage.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  const storage = window.LocalApp.storage;
  assert.equal(storage.saveRecovery('First'), true);
  assert.equal(storage.saveRecovery('Replacement'), true);
  assert.equal(storage.recoveryInfo().reason, 'Replacement');
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
  const context = vm.createContext({ window, localStorage, sessionStorage: localStorage, navigator: {}, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, Blob, TextEncoder, structuredClone, setTimeout, clearTimeout });
  for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/books.js', 'core/podcasts.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  window.LocalApp.utils.richTextToPlainText = String; window.LocalApp.utils.sanitizeRichHtml = String;
  for (const file of ['core/state.js', 'core/storage.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  const { storage, utils } = window.LocalApp;
  storage.load();
  const withBooks = utils.clone(storage.getState()); withBooks.workspace.books = [window.LocalApp.books.normalize({ id: 'book-one', title: 'Keep book', notes: 'Personal notes' })];
  storage.replace(withBooks, { saveRecovery: false });
  events.length = 0;
  const original = utils.clone(storage.getState()), persisted = values.get('topShelf.state.v5');
  const next = utils.clone(original); next.workspace.title = 'Cloud replacement';
  full = true;
  assert.throws(() => storage.replace(next), /Current data was kept/);
  assert.equal(JSON.stringify(storage.getState()), JSON.stringify(original));
  assert.equal(values.get('topShelf.state.v5'), persisted);
  assert.equal(events.filter(e => e.type === 'app:statechange').length, 0);
  assert.equal(storage.recoveryInfo().reason, 'Before data replacement');
  full = false;
  storage.replace(next, { saveRecovery: false });
  assert.equal(storage.getState().workspace.title, 'Cloud replacement');
});
