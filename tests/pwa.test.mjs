import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function harness({ save = true, online = true } = {}) {
  const events = {}, notices = [], messages = [], urls = [], timers = [];
  const button = { dataset: {}, setAttribute() {}, removeAttribute() {}, querySelector() { return {}; }, addEventListener() {} };
  const worker = { postMessage(message) { messages.push(message); } };
  const registration = { waiting: worker, update: async () => {}, addEventListener() {} };
  const App = { config: { identity: { buildId: 'test', assets: {} } }, storage: { saveNow: () => save, getState: () => ({ preferences: { appearance: { mode: 'light' } } }) }, icons: { set(el, icon) { button.icon = icon; } }, components: { toast(message) { notices.push(message); } } };
  const context = vm.createContext({ window: { LocalApp: App, matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {} }, document: { querySelector: selector => selector === '#updateAppButton' ? button : null, documentElement: { dataset: {} } }, navigator: { onLine: online, serviceWorker: { controller: {}, register: async () => registration, getRegistration: async () => registration, addEventListener(name, fn) { events[name] = fn; } } }, location: { href: 'https://example.com/app/', protocol: 'https:', replace(url) { urls.push(url); } }, URL });
  vm.runInContext(readFileSync(new URL('../assets/js/core/pwa.js', import.meta.url), 'utf8'), context);
  return { App, button, notices, messages, urls, timers, events };
}
test('waiting update marks the toolbar without an availability pop-up', async () => {
  const h = harness(); h.App.pwa.init(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.button.dataset.updateAvailable, 'true');
  assert.equal(h.button.icon, 'updateReady');
  assert.equal(h.notices.length, 0);
  await h.App.pwa.checkForUpdates(h.button);
  assert.equal(h.messages[0].type, 'SKIP_WAITING');
  h.events.controllerchange();
  assert.match(h.urls[0], /force-refresh=/);
});
test('update pauses for failed saves or offline operation without refreshing', async () => {
  for (const options of [{ save: false }, { online: false }]) {
    const h = harness(options); await h.App.pwa.checkForUpdates(h.button);
    assert.equal(h.urls.length, 0); assert.equal(h.messages.length, 0);
    assert.equal(h.notices.length, 1); assert.equal(h.button.disabled, false);
  }
});
