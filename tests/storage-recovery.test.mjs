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
  for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  window.LocalApp.utils.richTextToPlainText = String; window.LocalApp.utils.sanitizeRichHtml = String;
  for (const file of ['core/state.js', 'core/storage.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
  const storage = window.LocalApp.storage;
  assert.equal(storage.saveRecovery('First'), true);
  assert.equal(storage.saveRecovery('Replacement'), true);
  assert.equal(storage.recoveryInfo().reason, 'Replacement');
});
