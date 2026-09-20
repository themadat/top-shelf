import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('opening populated pivots renders all eight tables without summary cards', () => {
  const element = () => ({ innerHTML: '', dataset: {}, listeners: {}, classList: { toggle() {} }, setAttribute() {}, addEventListener(type, callback) { this.listeners[type] = callback; } });
  const nodes = new Map();
  for (const id of ['pivotGrid', 'pivotEmpty', 'pivotYearBasis', 'movieListView', 'moviePivotsView', 'movieToolbar']) nodes.set('#' + id, element());
  nodes.get('#pivotYearBasis').value = 'watched';
  const button = element(); button.dataset.movieView = 'pivots';
  const document = {
    querySelector: selector => nodes.get(selector) || null,
    querySelectorAll: selector => selector === '[data-movie-view]' ? [button] : []
  };
  const context = vm.createContext({ window: { addEventListener() {} }, document, structuredClone });
  for (const path of ['config.js', 'core/utils.js', 'core/movies.js', 'core/pivots.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
  const App = context.window.LocalApp;
  App.storage = { getState: () => ({ workspace: { movies: [App.movies.normalize({ id: 'one', tmdbId: 1, title: 'Example', status: 'watched', rating: 3.5 })] } }) };
  App.icons = { markup: () => '' };
  for (const dimension of App.pivots.dimensions) {
    const children = new Map([['tbody', element()], ['[data-pivot-count]', element()]]);
    nodes.set('#pivot-' + dimension.id, { querySelector: selector => children.get(selector), querySelectorAll: () => [] });
  }
  vm.runInContext(readFileSync(new URL('../assets/js/pivots-ui.js', import.meta.url), 'utf8'), context);
  App.pivotsUI.init();
  button.listeners.click();
  assert.equal(nodes.get('#pivotGrid').hidden, false);
  assert.equal(nodes.get('#pivotEmpty').hidden, true);
  for (const dimension of App.pivots.dimensions) {
    const html = nodes.get('#pivot-' + dimension.id).querySelector('tbody').innerHTML;
    assert.match(html, /<tr>/, dimension.id);
    assert.match(html, />3\.50<\/span>/, dimension.id);
  }
});
