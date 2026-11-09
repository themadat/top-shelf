import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('Movies renders safe How options, filters combined providers and retains a removed selection', () => {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', value: '', selectedOptions: [],
      setAttribute() {}, querySelector: child => node(selector + ' ' + child)
    });
    return nodes.get(selector);
  };
  const buttons = ['all', 'wishlist', 'watched'].map(value => ({ dataset: { movieFilter: value }, setAttribute() {}, querySelector: () => node('count-' + value) }));
  const document = { querySelector: node, querySelectorAll: () => buttons };
  const context = vm.createContext({ window: {}, document });
  for (const path of ['config.js', 'core/utils.js', 'core/movies.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
  const a = context.window.LocalApp;
  const state = { ui: { movieHowFilter: 'value:netflix', movieSorts: {} }, workspace: { movies: [
    a.movies.normalize({ id: 'shared', tmdbId: 1, title: 'Shared example', status: 'wishlist', how: '* Likely Netflix / Amazon Prime Video (~ date unknown)' }),
    a.movies.normalize({ id: 'netflix', tmdbId: 2, title: 'Netflix watched', status: 'watched', rating: 4, how: 'Netflix' }),
    a.movies.normalize({ id: 'hulu', tmdbId: 3, title: 'Hulu watched', status: 'watched', rating: 3, how: 'Hulu' }),
    a.movies.normalize({ id: 'blank', tmdbId: 4, title: 'Blank', status: 'wishlist', how: '' }),
    a.movies.normalize({ id: 'custom', tmdbId: 5, title: 'Custom', status: 'wishlist', how: 'Local <Disc>' }),
    { id: 'deleted', deleted: true, how: 'Hidden provider' }
  ] } };
  a.storage = { getState: () => state };
  a.icons = { markup: () => '' };
  a.createMovieBatches = () => ({ busy: () => false });
  a.movieColumns = { resize() {} };
  vm.runInContext(readFileSync(new URL('../assets/js/movies-ui.js', import.meta.url), 'utf8'), context);
  a.moviesUI.render();
  assert.equal(node('#movieResultsCount').textContent, '2 / 5');
  assert.match(node('#movieList').innerHTML, /data-edit-movie="shared"/);
  assert.match(node('#movieList').innerHTML, /data-edit-movie="netflix"/);
  assert.doesNotMatch(node('#movieList').innerHTML, /data-edit-movie="hulu"/);
  const options = node('#movieHowFilter').innerHTML;
  assert.equal((options.match(/value="value:netflix"/g) || []).length, 1);
  assert.match(options, /value:prime/);
  assert.match(options, /Local &lt;Disc&gt;/);
  assert.doesNotMatch(options, /Hidden provider|<Disc>/);
  assert.equal(node('#movieHowFilter').value, 'value:netflix');
  state.ui.movieHowFilter = 'missing'; a.moviesUI.render();
  assert.equal(node('#movieResultsCount').textContent, '1 / 5');
  assert.match(node('#movieList').innerHTML, /data-edit-movie="blank"/);
  state.ui.movieHowFilter = 'value:local <disc>'; a.moviesUI.render();
  assert.equal(node('#movieResultsCount').textContent, '1 / 5');
  assert.match(node('#movieList').innerHTML, /data-edit-movie="custom"/);
  state.workspace.movies = state.workspace.movies.filter(movie => ['hulu', 'blank'].includes(movie.id));
  state.ui.movieHowFilter = 'value:netflix'; a.moviesUI.render();
  assert.equal(node('#movieResultsCount').textContent, '0 / 2');
  assert.match(node('#movieHowFilter').innerHTML, /value="value:netflix">Netflix/);
  state.ui.movieHowFilter = ''; a.moviesUI.render();
  assert.equal(node('#movieResultsCount').textContent, '2 / 2');
});
