import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const context = vm.createContext({ window: {}, URL, TextEncoder, TextDecoder, Uint8Array, structuredClone });
for (const path of ['config.js', 'icons.js', 'core/utils.js', 'core/movies.js']) {
  vm.runInContext(read('assets/js/' + path), context);
}
const App = context.window.LocalApp;
App.utils = { ...App.utils, sanitizeRichHtml: String, richTextToPlainText: String };
vm.runInContext(read('assets/js/core/state.js'), context);

test('foundation identity, release, deployment, and storage surfaces agree', () => {
  const { config } = App;
  assert.equal(config.identity.name, 'Top Shelf');
  assert.equal(config.identity.version, config.identity.buildId);
  assert.equal(config.releases[0].version, config.identity.version);
  assert.match(read('.github/workflows/deploy-pages.yml').split('\n')[0], new RegExp('v' + config.identity.version.replaceAll('.', '\\.') + '$'));
  assert.equal(config.roadmap.length, 2);
  assert.deepEqual(Array.from(config.storage.legacyKeys), ['topShelf.state.v4']);
  for (const [key, value] of Object.entries(config.storage)) {
    if (key !== 'legacyKeys') assert.ok(value.startsWith('topShelf.'), key);
  }
  for (const path of ['index.html', 'manifest.webmanifest', 'manifest-dark.webmanifest']) {
    for (const match of read(path).matchAll(/\?v=([^"']+)/g)) assert.equal(match[1], config.identity.buildId);
  }
});

test('HTML, manifests, configuration, CSS, and offline shell references exist', () => {
  const check = path => assert.ok(existsSync(new URL(path.split('?')[0], root)), path);
  for (const match of read('index.html').matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (!/^(#|https?:)/.test(match[1])) check(match[1]);
  }
  for (const path of ['manifest.webmanifest', 'manifest-dark.webmanifest']) {
    const manifest = JSON.parse(read(path));
    assert.equal(manifest.name, App.config.identity.name);
    assert.equal(manifest.id, './top-shelf');
    check(manifest.start_url);
    manifest.icons.forEach(icon => check(icon.src));
  }
  Object.values(App.config.identity.assets).forEach(check);
  for (const match of read('assets/css/app.css').matchAll(/url\(["']?([^)'"\s]+)/g)) {
    if (!match[1].startsWith('data:')) check('assets/css/' + match[1]);
  }
  const workerContext = vm.createContext({ self: { addEventListener() {} } });
  vm.runInContext(read('sw.js') + '\nthis.shell = SHELL; this.version = ASSET_VERSION;', workerContext);
  assert.equal(workerContext.version, App.config.identity.buildId);
  workerContext.shell.forEach(check);
});

test('every static interface symbol and literal helper request resolves independently', () => {
  const files = ['index.html', 'assets/js/app.js', 'assets/js/core/components.js', 'assets/js/core/sync.js', 'assets/js/core/pwa.js'];
  const names = new Set();
  for (const path of files) {
    const source = read(path);
    for (const match of source.matchAll(/data-symbol="([a-zA-Z.0-9-]+)"/g)) names.add(match[1]);
    for (const match of source.matchAll(/icons\.markup\("([^"]+)"\)/g)) names.add(match[1]);
    for (const match of source.matchAll(/(?:symbol|actionSymbol): "([^"]+)"/g)) names.add(match[1]);
  }
  App.config.shelves.forEach(shelf => names.add(shelf.symbol));
  for (const name of names) assert.match(App.icons.markup(name), /^<svg\b/, name);
});

test('fresh content is empty, fixed sync target survives imports, and unknown modules are discarded', () => {
  const model = App.stateModel;
  const state = model.normalize(model.createDefaultState());
  assert.equal(state.workspace.documents[0].html, '');
  assert.equal(state.workspace.records.length, 0);
  assert.equal(JSON.stringify(model.syncPayload(state).data), '{}');
  assert.equal(model.syncPayload(state).syncFormat, 'top-shelf-app-data');
  state.modules.unrelatedProduct = { secret: 'discard' };
  state.modules.cloudSync.path = 'data/unrelated.json';
  const normalized = model.normalize(state);
  assert.equal(normalized.modules.unrelatedProduct, undefined);
  assert.equal(normalized.modules.cloudSync.path, 'data/top-shelf.json');
  assert.equal(model.exportEnvelope(normalized).exportFormat, 'top-shelf-backup');
  assert.throws(() => model.prepareSync({ syncFormat: 'another-app', syncVersion: 2, schemaVersion: 6, data: {} }), /not supported/);
});


test('shelf selection is normalized and local-only', () => {
  const model = App.stateModel;
  const state = model.normalize(model.createDefaultState());
  assert.equal(state.ui.selectedShelf, 'movies');
  const initial = model.syncHash(state);
  state.ui.selectedShelf = 'scotches';
  assert.equal(model.normalize(state).ui.selectedShelf, 'scotches');
  assert.equal(model.syncHash(state), initial);
  state.ui.selectedShelf = 'invalid';
  assert.equal(model.normalize(state).ui.selectedShelf, 'movies');
  assert.equal(new Set(App.config.shelves.map(shelf => shelf.shortcut)).size, 8);
});

test('banner timing defaults, bounds, backups, and sync isolation', () => {
  const model = App.stateModel;
  const base = model.normalize({});
  assert.equal(base.preferences.controls.whatsNewDismissSeconds, 20);
  const hash = model.syncHash(base);
  for (const [input, expected] of [[0, 1], [400, 300], [2.6, 3], ['bad', 20]]) {
    base.preferences.controls.whatsNewDismissSeconds = input;
    const normalized = model.normalize(base);
    assert.equal(normalized.preferences.controls.whatsNewDismissSeconds, expected);
    assert.equal(model.syncHash(normalized), hash);
    assert.equal(model.prepare(model.exportEnvelope(normalized)).state.preferences.controls.whatsNewDismissSeconds, expected);
  }
});
