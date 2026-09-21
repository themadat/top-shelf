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
  for (const file of ['config.js', 'icons.js', 'core/utils.js', 'core/movies.js', 'core/state.js']) {
    vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
    // Fixtures contain plain text; DOM sanitization is exercised in browser checks.
    if (file === 'core/utils.js') {
      window.LocalApp.utils = { ...window.LocalApp.utils, sanitizeRichHtml: String, richTextToPlainText: text => String(text)
        .replace(/<br\s*\/?>/gi, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') };
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
    baselineTarget: 'themadat/app-data/main/data/top-shelf.json', baselineHash: App.stateModel.syncHash(state), baselineSha: 'base-sha'
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


test('empty foundations sync only an empty content envelope, independent of device, UI, or save metadata', () => {
  const h = harness(), model = h.App.stateModel;
  const original = JSON.stringify(model.syncPayload(h.state));
  assert.deepEqual(JSON.parse(original), { syncFormat: 'top-shelf-app-data', syncVersion: 4, schemaVersion: 8, data: {} });
  assert.ok(Buffer.byteLength(JSON.stringify(model.syncPayload(h.state), null, 2)) < 120);
  h.App.storage.mutate(state => {
    state.preferences.appearance.mode = 'dark'; state.ui.search = 'cloud'; state.ui.supportTab = 'dataSync';
    state.ui.seenReleaseVersion = 'next-build';
    state.modules.roadmap.search = 'filter';
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
  h.App.storage.mutate(state => { state.preferences.appearance.mode = 'dark'; state.ui.search = 'local search'; });
  await h.sync.syncNow();
  assert.equal(h.state.workspace.documents[0].html, 'cloud content');
  assert.equal(h.state.preferences.appearance.mode, 'dark');
  assert.equal(h.state.ui.search, 'local search');
  h.App.storage.mutate(state => { state.ui.seenReleaseVersion = '0.0.1.1'; state.ui.supportTab = 'help'; state.modules.roadmap.search = 'done'; });
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
  h.state.modules.cloudSync.baselineTarget = 'themadat/app-data/main/data/top-shelf.json';
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
  assert.equal(written.syncVersion, 4);
  assert.equal(h.state.preferences.appearance.mode, 'system');
});

test('unchanged legacy SHA migrates the baseline even when local content changed', async () => {
  const h = harness(); h.legacy = true; h.setBaseline();
  h.state.modules.cloudSync.baselineHash = 'old-hash'; h.state.modules.cloudSync.baselineSha = 'remote-sha';
  changeNotes(h.state, 'unsynced note');
  await h.sync.check(true);
  assert.equal(h.sync.getInfo().change, 'local');
});

test('legacy restore retains actual content and local preferences; empty cloud clears notes', async () => {
  const h = harness(); h.legacy = true; h.confirmation = true;
  changeNotes(h.remote, 'old notes'); h.remote.preferences.appearance.mode = 'dark';
  await h.sync.restoreFromCloud();
  assert.equal(h.state.workspace.documents[0].html, 'old notes');
  assert.equal(h.state.preferences.appearance.mode, 'system');
  h.legacy = false; h.remote = h.App.stateModel.createDefaultState();
  await h.sync.restoreFromCloud();
  assert.equal(h.state.workspace.documents[0].html, '');
  assert.equal(h.sync.getInfo().state, 'upToDate');
});

test('multiline Unicode and literal HTML round trip as content; clearing Notes is a real change', async () => {
  const h = harness(); const model = h.App.stateModel;
  const notes = 'Cloud ☁️\n<literal> & "text"';
  changeNotes(h.state, h.App.utils.escapeHtml(notes).replace(/\n/g, '<br>'));
  const payload = model.syncPayload(h.state);
  assert.equal(payload.data.notes, notes);
  assert.equal(model.syncHash(model.prepareSync(payload).state), model.syncHash(h.state));
  h.remote = structuredClone(h.state); await h.sync.check(true);
  h.App.storage.mutate(state => { changeNotes(state, 'Updated Notes'); });
  assert.equal(h.sync.getInfo().state, 'pending');
  h.remote = structuredClone(h.state); await h.sync.check(true);
  h.App.storage.mutate(state => { changeNotes(state, ''); });
  assert.equal(h.sync.getInfo().state, 'pending');
});

test('merges combine disjoint content while preserving device settings; differing items require a choice', async () => {
  const h = harness(), model = h.App.stateModel;
  changeNotes(h.state, 'local notes'); h.state.preferences.appearance.mode = 'dark';
  h.remote.workspace.records = [{ id: 'record-a', title: 'Legacy content' }];
  assert.equal(model.canMerge(h.state, h.remote), true);
  const merged = model.merge(h.state, h.remote);
  assert.equal(merged.workspace.documents[0].html, 'local notes');
  assert.equal(merged.workspace.records[0].title, 'Legacy content');
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
  h.remote.workspace.records = [{ id: 'record-a', title: 'Legacy content' }];
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
  for (const transform of [p => ({ ...p, syncVersion: 999 }), p => ({ ...p, data: { notes: [] } }), p => ({ ...p, data: { unknown: 'content' } }), p => ({ ...p, data: { records: [{}] } }), () => null]) {
    const h = harness(); h.confirmation = true;
    const invalid = transform(h.App.stateModel.syncPayload(h.state));
    h.respond = () => response(200, { type: 'file', sha: 'sha', content: Buffer.from(JSON.stringify(invalid)).toString('base64') });
    await h.sync.restoreFromCloud();
    assert.equal(h.sync.getInfo().state, 'failed');
    assert.equal(h.replacements.length, 0);
    assert.ok(h.requests.every(request => request.options.method !== 'PUT'));
  }
});

function movieFixture(App, overrides = {}) {
  return App.movies.normalize({ id: 'movie-1', tmdbId: 872585, title: 'Oppenheimer', status: 'wishlist', ...overrides });
}

test('movie fields validate state-specific requirements and preserve decimal ratings', () => {
  const h = harness(), movies = h.App.movies;
  const wishlist = movieFixture(h.App);
  assert.equal(wishlist.priority, null);
  assert.equal(wishlist.availableDate, '');
  for (const priority of [0, 6, 2.5]) assert.throws(() => movieFixture(h.App, { priority }), /whole number/);
  for (const rating of [-0.1, 5.1, 'invalid']) assert.throws(() => movieFixture(h.App, { rating }), /Rating/);
  assert.throws(() => movieFixture(h.App, { status: 'watched' }), /need a rating/);
  assert.throws(() => movieFixture(h.App, { status: 'invalid' }), /Wishlist or Watched/);
  assert.throws(() => movieFixture(h.App, { availableDate: '2026-02-30' }), /Invalid movie date/);
  const watched = movieFixture(h.App, { status: 'watched', rating: 4.75, watchedDate: '2026-09-13', review: 'A <literal> review' });
  assert.equal(watched.rating, 4.75);
  assert.equal(watched.review, 'A <literal> review');
  assert.equal(movies.color(0, false), 'hsl(0 52% 25%)');
  assert.equal(movies.color(5, false), 'hsl(120 52% 25%)');
  assert.equal(movies.color(1, true), 'hsl(120 52% 88%)');
  assert.equal(movies.color(5, true), 'hsl(0 52% 88%)');
});

test('TMDB maps multiple directors, ordered top-ten cast, and optional collection', () => {
  const h = harness();
  const details = h.App.movies.fromTmdb({ id: 11, title: 'A movie', release_date: '2026-01-01', genres: [{ name: 'Drama' }], production_companies: [{ name: 'Studio' }], belongs_to_collection: { name: 'Collection, Volume I' }, credits: { crew: [{ job: 'Director', name: 'One' }, { job: 'Writer', name: 'Writer' }, { job: 'Director', name: 'Two' }], cast: Array.from({ length: 12 }, (_, i) => ({ name: 'Actor ' + (11 - i), order: 11 - i })) } });
  assert.equal(details.actors.length, 10);
  assert.equal(details.actors[0], 'Actor 0');
  assert.equal(details.actors[9], 'Actor 9');
  assert.equal(details.directors.join(', '), 'One, Two');
  assert.equal(details.collections[0], 'Collection, Volume I');
  assert.throws(() => h.App.movies.fromTmdb({ id: 11, title: 'Incomplete' }), /incomplete/);
});

test('movie content round trips through backups and sync with credentials omitted', async () => {
  const h = harness(), model = h.App.stateModel;
  h.state.workspace.movies = [movieFixture(h.App, { how: 'Cinema', other: 'With friends', priority: 1, notes: 'See in IMAX' })];
  const payload = model.syncPayload(h.state);
  assert.equal(payload.syncVersion, 4);
  assert.equal(payload.schemaVersion, 8);
  assert.equal(payload.data.movies[0].how, 'Cinema');
  assert.equal(model.syncHash(model.prepareSync(payload).state), model.syncHash(h.state));
  assert.equal(model.prepare(model.exportEnvelope(h.state)).state.workspace.movies[0].notes, 'See in IMAX');
  assert.ok(!JSON.stringify(model.exportEnvelope(h.state)).includes('test-token'));
  h.choice = 'upload';
  h.respond = (url, options) => options.method === 'PUT' ? response(200, { content: { sha: 'movies-sha' } }) : h.file();
  await h.sync.syncNow();
  const write = h.requests.find(r => r.options.method === 'PUT');
  assert.ok(write);
  const uploaded = JSON.parse(Buffer.from(JSON.parse(write.options.body).content, 'base64').toString());
  assert.equal(uploaded.data.movies[0].priority, 1);
});

test('movie deletions stay as tombstones and conflict with stale edits instead of resurrecting', () => {
  const h = harness(), model = h.App.stateModel;
  h.state.workspace.movies = [movieFixture(h.App)];
  h.remote.workspace.movies = [{ id: 'movie-1', deleted: true }];
  assert.equal(model.canMerge(h.state, h.remote), false);
  const restored = model.applySync(h.state, h.remote);
  assert.equal(restored.workspace.movies[0].deleted, true);
  assert.equal(model.syncPayload(restored).data.movies[0].deleted, true);
  h.state.workspace.movies = [movieFixture(h.App, { id: 'movie-2', tmdbId: 12 })];
  assert.equal(model.canMerge(h.state, h.remote), true);
  assert.equal(model.merge(h.state, h.remote).workspace.movies.length, 2);
});

test('old local and cloud data migrate without losing Notes or custom appearance', () => {
  const h = harness(), model = h.App.stateModel;
  const old = structuredClone(h.state); old.schemaVersion = 4; delete old.workspace.movies;
  old.preferences.appearance.accent = '#315f73'; old.preferences.appearance.accent2 = '#b86b4b';
  changeNotes(old, 'Keep my note');
  const prepared = model.prepare(old).state;
  assert.equal(prepared.workspace.documents[0].html, 'Keep my note');
  assert.equal(prepared.preferences.appearance.accent, '#008080');
  assert.equal(prepared.preferences.appearance.accent2, '#ff7f50');
  old.preferences.appearance.accent = '#123456';
  assert.equal(model.prepare(old).state.preferences.appearance.accent, '#123456');
  const cloud = model.prepareSync({ syncFormat: 'top-shelf-app-data', syncVersion: 1, schemaVersion: 5, data: { notes: 'Old cloud' } });
  assert.equal(cloud.legacy, true);
  assert.equal(cloud.state.workspace.documents[0].html, 'Old cloud');
  assert.equal(cloud.state.workspace.movies.length, 0);
});

test('malformed and duplicate movie imports fail without silently discarding content', () => {
  const h = harness(), model = h.App.stateModel;
  const movie = movieFixture(h.App);
  for (const movies of [{}, [{}], [movie, movie], [movie, { ...movie, id: 'another-id' }]]) {
    assert.throws(() => model.prepareSync({ syncFormat: 'top-shelf-app-data', syncVersion: 3, schemaVersion: 7, data: { movies } }));
  }
});


test('historical ratings retain labels, map scores, and allow unknown watch dates through backup and sync', () => {
  const h = harness(), model = h.App.stateModel;
  for (const [historicalRating, score] of Object.entries({ '100!': 5, YES: 4, MEH: 3, NO: 2, RUN: 1 })) {
    const movie = movieFixture(h.App, { status: 'watched', historicalRating, rating: 4.75, review: 'From my spreadsheet' });
    assert.equal(movie.rating, score);
    assert.equal(movie.watchedDate, '');
    h.state.workspace.movies = [movie];
    for (const restored of [model.prepare(model.exportEnvelope(h.state)).state, model.prepareSync(model.syncPayload(h.state)).state]) {
      assert.equal(restored.workspace.movies[0].historicalRating, historicalRating);
      assert.equal(restored.workspace.movies[0].rating, score);
      assert.equal(restored.workspace.movies[0].watchedDate, '');
    }
  }
  assert.throws(() => movieFixture(h.App, { historicalRating: 'MAYBE' }), /historical rating/);
  const numeric = movieFixture(h.App, { status: 'watched', rating: 4.75, review: 'Numeric only' });
  assert.equal(numeric.historicalRating, '');
  assert.equal(numeric.rating, 4.75);
  assert.throws(() => movieFixture(h.App, { status: 'watched', historicalRating: 'YES', review: 'Test', watchedDate: '2024-02-30' }), /Invalid movie date/);
});

test('previous movie sync format remains readable', () => {
  const h = harness();
  const movie = movieFixture(h.App, { status: 'watched', rating: 4, watchedDate: '2024-01-01', review: 'Old movie' });
  delete movie.historicalRating;
  const result = h.App.stateModel.prepareSync({ syncFormat: 'top-shelf-app-data', syncVersion: 2, schemaVersion: 6, data: { movies: [movie] } });
  assert.equal(result.legacy, true);
  assert.equal(result.state.workspace.movies[0].historicalRating, '');
  assert.equal(result.state.workspace.movies[0].rating, 4);
});

test('zero and half-point ratings with blank reviews survive save, backup, and sync', () => {
  const h = harness(), model = h.App.stateModel;
  for (const rating of [0, 0.5, 5]) {
    const movie = movieFixture(h.App, { status: 'watched', rating, review: '', watchedDate: '' });
    h.state.workspace.movies = [movie];
    for (const restored of [model.prepare(model.exportEnvelope(h.state)).state, model.prepareSync(model.syncPayload(h.state)).state]) {
      assert.equal(restored.workspace.movies[0].rating, rating);
      assert.equal(restored.workspace.movies[0].review, '');
      assert.equal(restored.workspace.movies[0].watchedDate, '');
    }
  }
  assert.throws(() => movieFixture(h.App, { status: 'watched', rating: null }), /need a rating/);
});

test('collection stars survive backup and content sync separately from manual tags', () => {
  const h = harness(), model = h.App.stateModel;
  h.state.workspace.movies = [movieFixture(h.App, { collections: ['One, Two'], starredCollections: ['One, Two'], other: 'Manual' })];
  for (const restored of [model.prepare(model.exportEnvelope(h.state)).state, model.prepareSync(model.syncPayload(h.state)).state]) {
    assert.deepEqual(Array.from(restored.workspace.movies[0].starredCollections), ['One, Two']);
    assert.equal(restored.workspace.movies[0].other, 'Manual');
  }
});

test('pivot preferences persist through backup, cloud download, and per-pivot merge', () => {
  const h = harness(), model = h.App.stateModel;
  const before = model.syncHash(h.state);
  h.state.workspace.pivotSettings = { ratings: { minimum: 3, sort: 'average', direction: 'asc' } };
  const expected = JSON.stringify(h.state.workspace.pivotSettings);
  assert.notEqual(model.syncHash(h.state), before);
  const remote = model.prepareSync(model.syncPayload(h.state)).state;
  for (const restored of [model.prepare(model.exportEnvelope(h.state)).state, remote, model.applySync(model.createDefaultState(), remote)]) {
    assert.equal(JSON.stringify(restored.workspace.pivotSettings), expected);
  }
  const local = model.createDefaultState();
  local.workspace.pivotSettings = { years: { minimum: 5, sort: 'category', direction: 'desc' } };
  const merged = model.merge(local, remote);
  assert.equal(merged.workspace.pivotSettings.ratings.minimum, 3);
  assert.equal(merged.workspace.pivotSettings.years.minimum, 5);
  local.workspace.pivotSettings.ratings = { minimum: 2, sort: 'count', direction: 'desc' };
  assert.throws(() => model.merge(local, remote), /Pivot settings differ/);
  assert.equal(Object.keys(model.applySync(remote, model.createDefaultState()).workspace.pivotSettings).length, 0);
});

test('old cloud data defaults pivot settings and invalid cloud settings are rejected', () => {
  const h = harness(), model = h.App.stateModel;
  const old = model.prepareSync({ syncFormat: 'top-shelf-app-data', syncVersion: 3, schemaVersion: 7, data: {} });
  assert.equal(old.legacy, true);
  assert.equal(Object.keys(old.state.workspace.pivotSettings).length, 0);
  for (const pivotSettings of [[], null, { unknown: {} }, { ratings: { minimum: 0, sort: 'count', direction: 'desc' } }, { ratings: { minimum: 1, sort: 'bad', direction: 'asc' } }]) {
    const payload = model.syncPayload(h.state); payload.data.pivotSettings = pivotSettings;
    assert.throws(() => model.prepareSync(payload), /invalid pivot settings/);
  }
});

test('movie tabs have independent saved defaults and sorts stay out of content sync', () => {
  const h = harness(), model = h.App.stateModel, movies = h.App.movies;
  const state = model.normalize(h.state);
  assert.equal(state.ui.movieSorts.all.key, 'rating');
  assert.equal(state.ui.movieSorts.wishlist.key, 'priority');
  assert.equal(state.ui.movieSorts.watched.key, 'watched');
  const hash = model.syncHash(state);
  state.ui.movieSorts.wishlist = { key: 'title', direction: 'desc' };
  const restored = model.prepare(model.exportEnvelope(state)).state;
  assert.equal(restored.ui.movieSorts.wishlist.key, 'title');
  assert.equal(restored.ui.movieSorts.all.key, 'rating');
  assert.equal(model.syncHash(state), hash);
  const a = movieFixture(h.App, { title: 'A', rating: 0, how: '--', notes: 'Z', availableDate: '2025-01-01' });
  const b = movieFixture(h.App, { title: 'B', rating: 4, how: 'Stream', notes: 'A', availableDate: '2026-01-01' });
  assert.ok(movies.compare(a, b, { key: 'rating', direction: 'asc' }) < 0);
  assert.ok(movies.compare(a, b, { key: 'rating', direction: 'desc' }) > 0);
  for (const direction of ['asc', 'desc']) assert.ok(movies.compare(a, b, { key: 'how', direction }) > 0);
  assert.ok(movies.compare(a, b, { key: 'review', direction: 'asc' }) > 0);
  assert.ok(movies.compare(a, b, { key: 'date', direction: 'desc' }) > 0);
});
