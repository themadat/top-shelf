import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test as nodeTest } from 'node:test';
const test = (name, fn) => nodeTest(name, { timeout: 5000 }, fn);
import vm from 'node:vm';

function harness({ token = 'test-token', online = true } = {}) {
  const events = [], requests = [], toasts = [], replacements = [];
  const listeners = new Map();
  const window = {
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatchEvent(event) { events.push(event); listeners.get(event.type)?.(event); },
    setInterval() {}, setTimeout() {}
  };
  const context = vm.createContext({ window, navigator: { onLine: online }, document: { addEventListener() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    TextEncoder, TextDecoder, Uint8Array, AbortController, structuredClone, atob, btoa, URL, console,
    fetch: async (url, options) => { requests.push({ url, options }); return h.respond(url, options); }
  });
  for (const file of ['config.js', 'icons.js', 'core/utils.js', 'core/state.js']) {
    vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
    // Fixtures contain plain text; DOM sanitization is exercised in browser checks.
    if (file === 'core/utils.js') {
      window.LocalApp.utils = { ...window.LocalApp.utils, sanitizeRichHtml: String, richTextToPlainText: text => String(text)
        .replace(/<br\s*\/?>/gi, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') };
      window.LocalApp.iconLibrary = {
        categories: [{ id: 'interface' }], sourceRepositories: [],
        icons: [{ id: 'icon-a', retiredIds: ['retired-icon-a'], label: 'Original', kind: 'sf-symbol', categories: ['interface'], source: '' }]
      };
    }
  }
  const App = window.LocalApp;
  let state = App.stateModel.normalize(App.stateModel.createDefaultState({ demo: false }));
  const h = { App, context, events, requests, toasts, replacements, get state() { return state; }, get token() { return token; },
    respond: () => response(500), recoveryWorks: true, confirmation: false, choice: 'cancel', recovery: null, legacy: false, choices: []
  };
  App.storage = {
    getState: () => state, hasSecret: () => Boolean(token), getSecret: () => token,
    setSecret(value) { token = value; return true; }, clearSecret() { token = ''; },
    mutate(callback, options = {}) { callback(state); if (options.touch !== false) App.stateModel.touch(state); state = App.stateModel.normalize(state); },
    saveRecovery() { if (!h.recoveryWorks) return false; h.recovery = structuredClone(state); return true; },
    replace(next, options) { replacements.push(options); state = next; }
  };
  App.components = {
    toast: (message, options) => toasts.push({ message, ...options }),
    message: (title, message) => toasts.push({ title, message }),
    choose: async options => { h.choices.push(options); return h.choice; }, confirm: async () => h.confirmation
  };
  vm.runInContext(readFileSync(new URL('../assets/js/core/sync.js', import.meta.url), 'utf8'), context);
  h.sync = App.sync;
  h.remote = structuredClone(state);
  h.file = () => response(200, { type: 'file', sha: 'remote-sha', content: Buffer.from(JSON.stringify(h.legacy ? h.remote : App.stateModel.syncPayload(h.remote))).toString('base64') });
  h.respond = h.file;
  h.setBaseline = () => Object.assign(state.modules.cloudSync, {
    baselineTarget: 'themadat/app-data/main/data/app-template.json', baselineHash: App.stateModel.syncHash(state), baselineSha: 'base-sha'
  });
  return h;
}
function response(status, body = {}) { return { status, ok: status >= 200 && status < 300, json: async () => body }; }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function changeNotes(state, text) { state.workspace.documents = [{ id: 'app-notes', title: 'Notes', html: text, createdAt: state.meta.createdAt, updatedAt: state.meta.updatedAt }]; }

const expected = {
  idle: ['icloud', 'neutral', 'Cloud Sync'],
  upToDate: ['checkmark.icloud', 'success', 'Up to Date'],
  syncing: ['arrow.trianglehead.2.clockwise.rotate.90.icloud', 'info', 'Syncing…'],
  uploading: ['icloud.and.arrow.up', 'info', 'Uploading…'],
  downloading: ['icloud.and.arrow.down', 'info', 'Downloading…'],
  pending: ['icloud.dashed', 'neutral', 'Waiting to Sync'],
  disabled: ['icloud.slash', 'neutral', 'Sync Disabled'],
  offline: ['icloud.slash', 'neutral', 'Offline'],
  warning: ['exclamationmark.icloud', 'warning', 'Sync Needs Attention'],
  failed: ['xmark.icloud', 'danger', 'Sync Failed'],
  authenticationRequired: ['key.icloud', 'warning', 'Sign In Required'],
  permissionDenied: ['lock.icloud', 'warning', 'Access Required'],
  connected: ['link.icloud', 'info', 'Connected'],
  shared: ['person.icloud', 'info', 'Shared']
};

test('all cloud states map to SF Symbols, semantic tints, accessible text, and only active syncing rotates', () => {
  const h = harness();
  assert.deepEqual(Object.keys(h.sync.CloudSyncState).sort(), Object.keys(expected).sort());
  assert.ok(Object.isFrozen(h.sync.CloudSyncState));
  for (const [state, [symbol, kind, title]] of Object.entries(expected)) {
    const info = h.sync.presentation(state);
    assert.deepEqual([info.symbol, info.kind, info.title], [symbol, kind, title]);
    assert.equal(info.accessibilityLabel, title);
    assert.ok(info.help.startsWith(title + '. '));
    assert.equal(info.animation, state === 'syncing' ? 'rotate' : 'none');
    const svg = h.App.icons.markup(symbol);
    assert.match(svg, /<svg class="sf-symbol"/);
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /currentColor/);
  }
  assert.match(h.App.icons.markup(h.sync.presentation('syncing').symbol), /<path class="sync-rotation"/);
  assert.equal(h.sync.presentation('permissionDenied', { hardDenial: true }).kind, 'danger');
  assert.equal(h.sync.presentation('permissionDenied').kind, 'warning');
  assert.equal(h.sync.actions.syncNow.symbol, 'arrow.trianglehead.clockwise.icloud');
  assert.equal(h.sync.actions.restore.symbol, 'arrow.trianglehead.counterclockwise.icloud');
  for (const action of Object.values(h.sync.actions)) {
    assert.ok(action.title && action.help && h.App.icons.markup(action.symbol));
    assert.notEqual(action.symbol, h.sync.presentation('syncing').symbol);
  }
});

test('missing credentials, disabled, offline, and a configured idle connection are distinct', async () => {
  const h = harness({ token: '' });
  assert.equal(h.sync.getInfo().state, 'authenticationRequired');
  await h.sync.syncNow();
  assert.equal(h.events.at(-1).type, 'app:opensyncsettings');
  h.context.navigator.onLine = false;
  assert.equal(h.sync.getInfo().state, 'offline');
  assert.equal(h.sync.getInfo().kind, 'neutral');
  h.state.modules.cloudSync.enabled = false;
  assert.equal(h.sync.getInfo().state, 'disabled');
  assert.equal(harness().sync.getInfo().state, 'connected');
  assert.equal(harness().sync.getInfo().animation, 'none');
});

test('real checks show two-arrow activity, settle to up to date, and classify queued or divergent changes', async () => {
  const h = harness();
  h.setBaseline();
  const pending = deferred(); h.respond = () => pending.promise;
  const checking = h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'syncing');
  assert.equal(h.sync.getInfo().canSync, false);
  await h.sync.syncNow(); await h.sync.testConnection({});
  assert.equal(h.requests.length, 1);
  pending.resolve(h.file()); await checking;
  assert.equal(h.sync.getInfo().state, 'upToDate', h.sync.getInfo().message);
  changeNotes(h.state, 'local edit');
  assert.equal(h.sync.getInfo().state, 'pending');
  assert.equal(h.sync.getInfo().change, 'local');
  h.respond = h.file; changeNotes(h.remote, 'remote edit');
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'warning');
  assert.equal(h.sync.getInfo().change, 'conflict');
  assert.equal(h.sync.getInfo().kind, 'warning');
});

for (const [status, message, state] of [[401, '', 'authenticationRequired'], [403, '', 'permissionDenied'], [403, 'API rate limit exceeded', 'warning'], [404, '', 'warning'], [409, '', 'warning'], [422, '', 'warning'], [429, '', 'warning'], [500, '', 'failed']]) {
  test(`HTTP ${status} ${message} produces ${state} and does not persist a failed test token`, async () => {
    const h = harness();
    h.respond = () => response(status, { message });
    await assert.rejects(h.sync.testConnection({ ...h.state.modules.cloudSync, token: 'unsaved-new-token' }));
    assert.equal(h.sync.getInfo().state, state);
    assert.equal(h.sync.getInfo().animation, 'none');
    assert.equal(h.token, 'test-token');
  });
}

test('a test using unsaved credentials is active and then Connected without an endless spinner', async () => {
  const h = harness({ token: '' }); const pending = deferred();
  h.respond = () => pending.promise;
  const testing = h.sync.testConnection({ ...h.state.modules.cloudSync, token: 'new-token', rememberToken: false });
  assert.equal(h.sync.getInfo().state, 'syncing');
  pending.resolve(h.file()); await testing;
  assert.equal(h.sync.getInfo().state, 'connected');
  assert.equal(h.token, 'new-token');
  assert.equal(h.state.modules.cloudSync.rememberToken, false);
});

test('missing remote is static pending and malformed JSON is a failed attempt', async () => {
  const h = harness(); h.respond = () => response(404);
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'pending');
  assert.equal(h.sync.getInfo().canRestore, false);
  h.respond = () => response(200, { type: 'file', sha: 'sha', content: btoa('invalid json') });
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'failed');
});

test('network unavailability is neutral and reconnect can recover', async () => {
  const h = harness(); h.sync.init();
  h.respond = () => { throw new Error('Failed to fetch'); };
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'offline');
  assert.equal(h.sync.getInfo().kind, 'neutral');
  h.respond = h.file;
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'upToDate', h.sync.getInfo().message);
});

test('upload direction stays static; an edit during upload remains pending after completion', async () => {
  const h = harness(); h.setBaseline(); changeNotes(h.state, 'upload me');
  const writing = deferred(); const started = deferred();
  h.respond = (url, options) => { if (options.method === 'PUT') { started.resolve(); return writing.promise; } return h.file(); };
  const syncing = h.sync.syncNow(); await started.promise;
  assert.equal(h.sync.getInfo().state, 'uploading');
  assert.equal(h.sync.getInfo().animation, 'none');
  changeNotes(h.state, 'newer edit');
  writing.resolve(response(200, { content: { sha: 'new-sha' } })); await syncing;
  assert.equal(h.sync.getInfo().state, 'pending');
});

test('restore cancellation preserves data; confirmation saves recovery and local cloud settings', async () => {
  const h = harness(); changeNotes(h.remote, 'cloud content');
  const cloud = structuredClone(h.state.modules.cloudSync);
  await h.sync.restoreFromCloud();
  assert.equal(h.replacements.length, 0);
  h.confirmation = true;
  await h.sync.restoreFromCloud();
  assert.equal(h.replacements.length, 1);
  assert.ok(h.recovery);
  assert.equal(h.state.workspace.documents[0].html, 'cloud content');
  assert.equal(h.state.modules.cloudSync.rememberToken, cloud.rememberToken);
  assert.equal(h.sync.getInfo().state, 'upToDate', h.sync.getInfo().message);
  assert.ok(h.events.some(event => event.detail?.info?.state === 'downloading'));
});

test('restore refuses replacement when a recovery copy cannot be saved', async () => {
  const h = harness(); h.confirmation = true; h.recoveryWorks = false;
  await h.sync.restoreFromCloud();
  assert.equal(h.replacements.length, 0);
  assert.equal(h.sync.getInfo().state, 'failed');
  assert.match(h.sync.getInfo().message, /recovery copy/);
});

test('forgetting a connection prevents stale errors and a pending restore from applying', async () => {
  const h = harness(); const pending = deferred(); h.respond = () => pending.promise;
  const checking = h.sync.check(true); await h.sync.forget();
  pending.resolve(response(401)); await checking;
  assert.equal(h.sync.getInfo().state, 'authenticationRequired');
  assert.doesNotMatch(h.sync.getInfo().message, /rejected/);
  const r = harness(); const decision = deferred(); const opened = deferred();
  r.App.components.confirm = () => { opened.resolve(); return decision.promise; };
  const restoring = r.sync.restoreFromCloud(); await opened.promise;
  const count = r.requests.length; await r.sync.check(true);
  assert.equal(r.requests.length, count);
  await r.sync.forget(); decision.resolve(true); await restoring;
  assert.equal(r.replacements.length, 0);
});

test('ordinary remote-only sync downloads without writing to GitHub', async () => {
  const h = harness(); h.setBaseline(); changeNotes(h.remote, 'remote-only edit');
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'pending');
  assert.equal(h.sync.getInfo().change, 'remote');
  await h.sync.syncNow();
  assert.equal(h.state.workspace.documents[0].html, 'remote-only edit');
  assert.ok(h.recovery);
  assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  assert.equal(h.sync.getInfo().state, 'upToDate');
});

test('first upload still requires a choice; a synchronized copy needs no write', async () => {
  const h = harness(); h.respond = (url, options) => options.method === 'PUT' ? response(200, { content: { sha: 'new-sha' } }) : response(404);
  await h.sync.syncNow();
  assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  h.choice = 'upload'; await h.sync.syncNow();
  assert.ok(h.requests.some(request => request.options.method === 'PUT'));
  assert.equal(h.sync.getInfo().state, 'upToDate');
  const current = harness(); await current.sync.syncNow();
  assert.ok(current.requests.every(request => request.options.method !== 'PUT'));
  assert.equal(current.sync.getInfo().state, 'upToDate');
});


test('empty templates sync only an empty content envelope, independent of device, UI, or save metadata', () => {
  const h = harness(), model = h.App.stateModel;
  const original = JSON.stringify(model.syncPayload(h.state));
  assert.deepEqual(JSON.parse(original), { syncFormat: 'local-first-app-data', syncVersion: 1, schemaVersion: 5, data: {} });
  assert.ok(Buffer.byteLength(JSON.stringify(model.syncPayload(h.state), null, 2)) < 120);
  h.App.storage.mutate(state => {
    state.preferences.appearance.mode = 'dark'; state.ui.search = 'cloud'; state.ui.supportTab = 'dataSync';
    state.ui.seenReleaseVersion = 'next-build'; state.modules.iconLibrary.weight = 'light';
    state.modules.iconLibrary.sidebarWidth = 280; state.modules.roadmap.search = 'filter';
    state.workspace.title = 'This computer'; state.workspace.documents[0].updatedAt = '2000-01-01T00:00:00.000Z';
    state.meta.createdAt = '2000-01-01T00:00:00.000Z'; state.meta.tombstones.records = [{ id: 'old', deletedAt: state.meta.createdAt }];
  });
  assert.equal(h.state.ui.supportTab, 'dataSync');
  assert.equal(JSON.stringify(model.syncPayload(h.state)), original);
  assert.equal(model.syncHash(h.state), model.syncHash(model.createDefaultState()));
  const backup = model.exportEnvelope(h.state);
  assert.equal(backup.state.preferences.appearance.mode, 'dark');
  assert.equal(backup.state.ui.search, 'cloud');
});

test('download and subsequent release dismissal, Settings, filter, and theme changes stay up to date', async () => {
  const h = harness(); h.setBaseline(); changeNotes(h.remote, 'cloud content');
  h.App.storage.mutate(state => { state.preferences.appearance.mode = 'dark'; state.ui.search = 'local search'; state.modules.iconLibrary.weight = 'light'; });
  await h.sync.syncNow();
  assert.equal(h.state.workspace.documents[0].html, 'cloud content');
  assert.equal(h.state.preferences.appearance.mode, 'dark');
  assert.equal(h.state.ui.search, 'local search');
  assert.equal(h.state.modules.iconLibrary.weight, 'light');
  h.App.storage.mutate(state => { state.ui.seenReleaseVersion = '0.0.1.67'; state.ui.supportTab = 'help'; state.modules.roadmap.search = 'done'; });
  assert.equal(h.sync.getInfo().state, 'upToDate');
  await h.sync.syncNow();
  assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  changeNotes(h.state, 'actual edit');
  assert.equal(h.sync.getInfo().state, 'pending');
  changeNotes(h.state, 'cloud content');
  assert.equal(h.sync.getInfo().state, 'upToDate');
});

test('legacy whole-state files migrate without false conflicts and compact on explicit Sync Now', async () => {
  const h = harness(); h.legacy = true;
  h.state.modules.cloudSync.baselineTarget = 'themadat/app-data/main/data/app-template.json';
  h.state.modules.cloudSync.baselineHash = 'old-whole-state-hash';
  h.remote.preferences.appearance.mode = 'dark'; h.remote.ui.search = 'another computer';
  h.respond = (url, options) => options.method === 'PUT' ? response(200, { content: { sha: 'compact-sha' } }) : h.file();
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'upToDate');
  assert.match(h.state.modules.cloudSync.baselineHash, /^data-v1:/);
  assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  await h.sync.syncNow();
  const written = JSON.parse(Buffer.from(JSON.parse(h.requests.find(r => r.options.method === 'PUT').options.body).content, 'base64').toString());
  assert.deepEqual(written.data, {});
  assert.equal(written.syncVersion, 1);
  assert.equal(h.state.preferences.appearance.mode, 'system');
});

test('unchanged legacy SHA migrates the baseline even when local content changed', async () => {
  const h = harness(); h.legacy = true; h.setBaseline();
  h.state.modules.cloudSync.baselineHash = 'old-hash'; h.state.modules.cloudSync.baselineSha = 'remote-sha';
  changeNotes(h.state, 'unsynced note');
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().change, 'local');
});

test('legacy restore retains actual content and local preferences; empty cloud clears notes and edits', async () => {
  const h = harness(); h.legacy = true; h.confirmation = true;
  changeNotes(h.remote, 'old notes'); h.remote.preferences.appearance.mode = 'dark';
  h.remote.modules.iconLibrary.overrides = [{ iconId: 'icon-a', label: 'Renamed', categories: ['interface'] }];
  await h.sync.restoreFromCloud();
  assert.equal(h.state.workspace.documents[0].html, 'old notes');
  assert.equal(h.state.modules.iconLibrary.overrides[0].label, 'Renamed');
  assert.equal(h.state.preferences.appearance.mode, 'system');
  h.legacy = false; h.remote = h.App.stateModel.createDefaultState();
  await h.sync.restoreFromCloud();
  assert.equal(h.state.workspace.documents[0].html, '');
  assert.equal(h.state.modules.iconLibrary.overrides.length, 0);
  assert.equal(h.sync.getInfo().state, 'upToDate');
});

test('multiline Unicode and literal HTML round trip as content; resetting icon edits is a real change', async () => {
  const h = harness(); const model = h.App.stateModel;
  const notes = 'Cloud ☁️\n<literal> & "text"';
  changeNotes(h.state, h.App.utils.escapeHtml(notes).replace(/\n/g, '<br>'));
  const payload = model.syncPayload(h.state);
  assert.equal(payload.data.notes, notes);
  assert.equal(model.syncHash(model.prepareSync(payload).state), model.syncHash(h.state));
  h.remote = structuredClone(h.state); await h.sync.check(true);
  h.App.storage.mutate(state => { state.modules.iconLibrary.overrides = [{ iconId: 'icon-a', label: 'Renamed', categories: ['interface'] }]; });
  assert.equal(h.sync.getInfo().state, 'pending');
  h.remote = structuredClone(h.state); await h.sync.check(true);
  h.App.storage.mutate(state => { state.modules.iconLibrary.overrides = []; });
  assert.equal(h.sync.getInfo().state, 'pending');
});

test('baked icon overrides normalize away on both sides, including after a reload', async () => {
  const h = harness(); h.legacy = true;
  h.remote.modules.iconLibrary.overrides = [{ iconId: 'icon-a', label: 'Original', categories: ['interface'], kind: 'sf-symbol' }];
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'upToDate');
  assert.equal(h.App.stateModel.syncPayload(h.remote).data.iconOverrides, undefined);
});

test('merges combine disjoint content while preserving device settings; differing items require a choice', async () => {
  const h = harness(), model = h.App.stateModel;
  changeNotes(h.state, 'local notes'); h.state.preferences.appearance.mode = 'dark';
  h.remote.modules.iconLibrary.overrides = [{ iconId: 'icon-a', label: 'Cloud label', categories: ['interface'] }];
  assert.equal(model.canMerge(h.state, h.remote), true);
  const merged = model.merge(h.state, h.remote);
  assert.equal(merged.workspace.documents[0].html, 'local notes');
  assert.equal(merged.modules.iconLibrary.overrides[0].label, 'Cloud label');
  assert.equal(merged.preferences.appearance.mode, 'dark');
  changeNotes(h.remote, 'different notes');
  assert.equal(model.canMerge(h.state, h.remote), false);
  await h.sync.syncNow();
  assert.ok(h.choices[0].choices.every(choice => choice.value !== 'merge'));
  assert.equal(h.replacements.length, 0);
  assert.throws(() => model.merge(h.state, h.remote), /Notes differ/);
});

test('merge refuses to replace data or upload when recovery cannot be saved', async () => {
  const h = harness(); h.choice = 'merge'; h.recoveryWorks = false;
  changeNotes(h.state, 'keep locally');
  h.remote.modules.iconLibrary.overrides = [{ iconId: 'icon-a', label: 'Cloud label', categories: ['interface'] }];
  await h.sync.syncNow();
  assert.equal(h.replacements.length, 0);
  assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  assert.equal(h.sync.getInfo().state, 'failed');
});

test('nonempty legacy records survive compact round trips without save timestamps or empty scaffolding', () => {
  const h = harness(), model = h.App.stateModel;
  h.state.workspace.records = [{ id: 'record-1', title: 'Keep me', summary: 'actual data' }];
  const payload = model.syncPayload(h.state);
  assert.equal(payload.data.records[0].title, 'Keep me');
  assert.equal(payload.data.records[0].updatedAt, undefined);
  assert.equal(model.syncHash(model.prepareSync(payload).state), model.syncHash(h.state));
});

test('invalid or future cloud data is rejected without replacing or uploading content', async () => {
  for (const transform of [p => ({ ...p, syncVersion: 2 }), p => ({ ...p, data: { notes: [] } }), p => ({ ...p, data: { unknown: 'content' } }), p => ({ ...p, data: { iconOverrides: [{}] } }), () => null]) {
    const h = harness(); h.confirmation = true;
    const invalid = transform(h.App.stateModel.syncPayload(h.state));
    h.respond = () => response(200, { type: 'file', sha: 'sha', content: Buffer.from(JSON.stringify(invalid)).toString('base64') });
    await h.sync.restoreFromCloud();
    assert.equal(h.sync.getInfo().state, 'failed');
    assert.equal(h.replacements.length, 0);
    assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  }
});


test('Sync Now removes baked overrides from an already compact cloud file without marking content pending', async () => {
  const h = harness();
  const payload = JSON.parse(JSON.stringify(h.App.stateModel.syncPayload(h.state)));
  payload.data.iconOverrides = [{ iconId: 'icon-a', label: 'Original', kind: 'sf-symbol', categories: ['interface'], source: '' }];
  h.respond = (url, options) => options.method === 'PUT'
    ? response(200, { content: { sha: 'clean-sha' } })
    : response(200, { type: 'file', sha: 'remote-sha', content: Buffer.from(JSON.stringify(payload)).toString('base64') });
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().state, 'upToDate');
  assert.ok(h.requests.every(r => r.options.method !== 'PUT'));
  await h.sync.syncNow();
  const write = h.requests.find(r => r.options.method === 'PUT');
  assert.ok(write);
  const written = JSON.parse(Buffer.from(JSON.parse(write.options.body).content, 'base64').toString());
  assert.deepEqual(written.data, {});
  assert.equal(h.sync.getInfo().state, 'upToDate');
});


test('retired icon edits migrate through sync payloads and canonical edits take precedence', () => {
  const h = harness();
  const alias = { iconId: 'retired-icon-a', label: 'Alias edit', categories: ['interface'] };
  const canonical = { iconId: 'icon-a', label: 'Canonical edit', categories: ['interface'] };
  h.state.modules.iconLibrary.overrides = [alias];
  assert.equal(h.App.stateModel.syncPayload(h.state).data.iconOverrides[0].iconId, 'icon-a');
  assert.equal(h.App.stateModel.syncPayload(h.state).data.iconOverrides[0].label, 'Alias edit');
  for (const overrides of [[alias, canonical], [canonical, alias]]) {
    h.state.modules.iconLibrary.overrides = overrides;
    const normalized = h.App.stateModel.normalize(h.state).modules.iconLibrary.overrides;
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].label, 'Canonical edit');
  }
});

test('name-only search survives local normalization without entering the sync payload', () => {
  const h = harness();
  const originalPayload = JSON.stringify(h.App.stateModel.syncPayload(h.state));
  h.state.ui.search = 'Hide Play';
  h.state.ui.searchNameOnly = true;
  const normalized = h.App.stateModel.normalize(h.state);
  assert.equal(normalized.ui.searchNameOnly, true);
  assert.equal(normalized.ui.search, 'Hide Play');
  assert.equal(JSON.stringify(h.App.stateModel.syncPayload(normalized)), originalPayload);
  h.state.ui.searchNameOnly = 'true';
  assert.equal(h.App.stateModel.normalize(h.state).ui.searchNameOnly, false);
});
