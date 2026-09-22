import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('opening populated pivots renders all eight tables without summary cards', () => {
  const element = () => ({ innerHTML: '', dataset: {}, listeners: {}, classList: { toggle() {} }, setAttribute() {}, addEventListener(type, callback) { this.listeners[type] = callback; } });
  const nodes = new Map();
  for (const id of ['pivotScoring', 'pivotBaseline', 'pivotWeight', 'pivotGrid', 'pivotEmpty', 'pivotYearBasis', 'movieListView', 'moviePivotsView', 'movieToolbar']) nodes.set('#' + id, element());
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
    const children = new Map([['tbody', element()], ['[data-pivot-count]', element()], ['[data-pivot-min]', element()]]);
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
    if (['other', 'collections'].includes(dimension.id)) {
      assert.doesNotMatch(html, /No Other Pivots|No Collection Listed/);
      assert.match(html, /No matching groups/);
    } else assert.match(html, />3\.50<\/span>/, dimension.id);
  }
  const grid = nodes.get('#pivotGrid');
  assert.equal((grid.innerHTML.match(/data-pivot-search=/g) || []).length, 8);
  const ratingBody = nodes.get('#pivot-ratings').querySelector('tbody');
  const yearBefore = nodes.get('#pivot-years').querySelector('tbody').innerHTML;
  grid.listeners.input({ target: { dataset: { pivotSearch: 'ratings' }, value: 'not a rating' } });
  assert.match(ratingBody.innerHTML, /No matching groups/);
  assert.equal(nodes.get('#pivot-years').querySelector('tbody').innerHTML, yearBefore);
  grid.listeners.input({ target: { dataset: { pivotSearch: 'ratings' }, value: ' 3.5 ' } });
  assert.match(ratingBody.innerHTML, />3\.50<\/span>/);
  grid.listeners.input({ target: { dataset: { pivotSearch: 'ratings' }, value: '' } });
  assert.match(ratingBody.innerHTML, />3\.50<\/span>/);

  assert.equal((grid.innerHTML.match(/data-pivot-resize=/g) || []).length, 8);
  App.storage.getState = () => ({ workspace: { movies: [
    App.movies.normalize({ id: 'a', tmdbId: 11, title: 'A', status: 'watched', rating: 5, other: 'Alpha, Subgenre Time Travel' }),
    App.movies.normalize({ id: 'b', tmdbId: 12, title: 'B', status: 'watched', rating: 2, other: 'Beta, Subgenre Loop' })
  ] } });
  button.listeners.click();
  const otherBody = nodes.get('#pivot-other').querySelector('tbody');
  assert.match(otherBody.innerHTML, /data-subsection-sort="category"/);
  const localUi = {};
  const getState = App.storage.getState;
  App.storage.getState = () => ({...getState(), ui: localUi});
  App.storage.mutate = callback => callback(App.storage.getState());
  App.storage.saveNow = () => true;
  const clickSort = (section, key) => grid.listeners.click({ target: { closest: selector => selector === '[data-subsection-sort]' ? { dataset: { subsection: section, subsectionSort: key } } : null } });
  clickSort('Others', 'category');
  assert.ok(otherBody.innerHTML.indexOf('title="Beta"') < otherBody.innerHTML.indexOf('title="Alpha"'));
  assert.ok(otherBody.innerHTML.indexOf('title="Alpha"') < otherBody.innerHTML.indexOf('title="Time Travel"'));
  assert.ok(otherBody.innerHTML.indexOf('title="Time Travel"') < otherBody.innerHTML.indexOf('title="Loop"'));
  clickSort('Others', 'category');
  assert.ok(otherBody.innerHTML.indexOf('title="Alpha"') < otherBody.innerHTML.indexOf('title="Beta"'));
  assert.ok(otherBody.innerHTML.indexOf('title="Time Travel"') < otherBody.innerHTML.indexOf('title="Loop"'));

});
