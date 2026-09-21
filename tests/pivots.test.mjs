import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
const context = vm.createContext({ window: {}, structuredClone });
for (const path of ['config.js', 'core/utils.js', 'core/movies.js', 'core/pivots.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
const App = context.window.LocalApp;
const movie = (id, fields = {}) => App.movies.normalize({ id: String(id), tmdbId: id, title: 'Movie ' + id, status: 'watched', review: 'Review', rating: 4, ...fields });
const data = [movie(1, { historicalRating: '100!', releaseDate: '2000-01-01', watchedDate: '2024-01-01', genres: ['Drama', 'Comedy'], actors: ['A', 'B'], directors: ['Director'], collections: ['A, B Collection'], productionCompanies: ['Studio'] }), movie(2, { rating: 2.5, releaseDate: '2000-06-01', genres: ['Drama'], actors: ['A'], directors: ['Director'] }), movie(3, { historicalRating: 'RUN', releaseDate: '2001-01-01', watchedDate: '2024-02-01' }), movie(4, { status: 'wishlist', rating: 5, genres: ['Wishlist only'] }), { id: 'deleted', deleted: true }];

test('pivots include all watched movies once per group and average mapped historical scores', () => {
  const result = App.pivots.build(data, 'release');
  assert.equal(result.count, 3);
  assert.equal(result.average, 8.5 / 3);
  assert.equal(result.unknownDates, 1);
  assert.equal(result.groups.genres.find(row => row.name === 'Drama').count, 2);
  assert.equal(result.groups.genres.find(row => row.name === 'Drama').average, 3.75);
  assert.equal(result.groups.genres.some(row => row.name === 'Wishlist only'), false);
  assert.equal(result.groups.collections.find(row => row.name === 'A, B Collection').count, 1);
  assert.equal(result.groups.actors.find(row => row.name === 'A').count, 2);
  assert.equal(result.groups.directors.find(row => row.name === 'Director').average, 3.75);
  assert.equal(result.groups.productionCompanies.find(row => row.name === 'Studio').average, 5);
  assert.equal(result.groups.ratings.find(row => row.name === '2.5').count, 1);
  assert.equal(result.groups.ratings.reduce((sum, row) => sum + row.count, 0), 3);
});

test('year basis includes unknown dates and metadata gaps keep all movies represented', () => {
  const releases = App.pivots.build(data, 'release');
  assert.equal(releases.groups.years.find(row => row.name === '2000').count, 2);
  const watched = App.pivots.build(data, 'watched');
  assert.equal(watched.groups.years.find(row => row.name === '2024').count, 2);
  assert.equal(watched.groups.years.find(row => row.missing).count, 1);
  assert.equal(watched.groups.collections.find(row => row.missing).count, 2);
  assert.equal(App.pivots.build([movie(10)], 'release').groups.years[0].missing, true);
});

test('counts and averages sort independently with thresholds and stable ties without changing input', () => {
  const groups = App.pivots.build(data, 'release').groups.genres;
  const before = JSON.stringify(groups);
  assert.equal(App.pivots.rows(groups, 2, 'count').length, 1);
  assert.equal(App.pivots.rows(groups, 1, 'average')[0].name, 'Comedy');
  assert.equal(App.pivots.rows(groups, 1, 'count')[0].name, 'Drama');
  assert.equal(App.pivots.rows(groups, 10, 'count').length, 0);
  assert.equal(JSON.stringify(groups), before);
  const years = App.pivots.build(data, 'release').groups.years;
  assert.equal(App.pivots.rows(years, 1, 'name')[0].name, '2000');
  assert.equal(App.pivots.rows(years, 1, 'name-desc')[0].name, '2001');
});

test('empty, repeated metadata, special names, and an edit are handled without stale aggregates', () => {
  assert.equal(App.pivots.build([], 'release').average, null);
  const item = movie(10, { genres: ['Drama'], actors: ['__proto__', '<Actor>'] });
  item.genres.push('Drama');
  assert.equal(App.pivots.build([item], 'release').groups.genres[0].count, 1);
  assert.equal(App.pivots.build([item], 'release').groups.actors.length, 2);
  item.rating = 1;
  assert.equal(App.pivots.build([item], 'release').average, 1);
  item.status = 'wishlist';
  assert.equal(App.pivots.build([item], 'release').count, 0);
});


test('rating value sorting compares decimals numerically', () => {
  const values = App.pivots.build([movie(1, { rating: 4.2 }), movie(2, { rating: 4.11 })], 'release').groups.ratings;
  assert.equal(App.pivots.rows(values, 1, 'name')[0].name, '4.11');
  assert.equal(App.pivots.rows(values, 1, 'name-desc')[0].name, '4.2');
});

test('Other Pivots split tags, deduplicate case variants, and exclude availability notes', () => {
  const result = App.pivots.build([movie(1, { other: 'MCU,Loop,loop\nOriginal availability note: DVD 2/7', rating: 5 }), movie(2, { other: 'Loop,Pixar', rating: 1 }), movie(3, { status: 'wishlist', other: 'Wishlist Only' })], 'release');
  assert.equal(result.groups.other.length, 3);
  assert.equal(result.groups.other.find(row => row.name === 'Loop').count, 2);
  assert.equal(result.groups.other.find(row => row.name === 'Loop').average, 3);
  assert.deepEqual(Array.from(App.pivots.dimensions, d => d.title), ['Ratings', 'Years', 'Genres', 'Other Pivots', 'Collections', 'Actors', 'Directors', 'Companies']);
});

test('Count and Average support both sort directions without modifying the groups', () => {
  const groups = App.pivots.build(data, 'release').groups.genres;
  const before = JSON.stringify(groups);
  for (const sort of ['count', 'average']) {
    for (const direction of ['asc', 'desc']) {
      const rows = App.pivots.rows(groups, 1, sort, direction);
      for (let i = 1; i < rows.length; i++) assert(direction === 'asc' ? rows[i-1][sort] <= rows[i][sort] : rows[i-1][sort] >= rows[i][sort]);
    }
  }
  assert.equal(JSON.stringify(groups), before);
});

test('Category sorts numeric values both ways and keeps unknown years last', () => {
  const groups = App.pivots.build([movie(1, { watchedDate: '2025-01-01' }), movie(2, { watchedDate: '1999-01-01' }), movie(3)]).groups.years;
  assert.deepEqual(Array.from(App.pivots.rows(groups, 1, 'category', 'desc'), r => r.name), ['2025', '1999', '????']);
  assert.deepEqual(Array.from(App.pivots.rows(groups, 1, 'category', 'asc'), r => r.name), ['1999', '2025', '????']);
});

test('starred collections keep whole names and deduplicate manual Other tags', () => {
  const item = movie(1, { collections: ['One, Two', 'Drama'], starredCollections: ['One, Two', 'Drama', 'Not a member'], other: 'drama' });
  const groups = App.pivots.build([item]).groups.other;
  assert.deepEqual(Array.from(groups, row => row.name).sort(), ['One, Two', 'drama']);
  assert.equal(groups.find(row => row.name === 'drama').count, 1);
});

test('alphabetical group sorting puts dash markers last', () => {
  const groups = App.pivots.build([movie(1, { other: '--, Zebra, Apple' })]).groups.other;
  for (const sort of ['name', 'category']) assert.deepEqual(Array.from(App.pivots.rows(groups, 1, sort, 'asc'), row => row.name), ['Apple', 'Zebra', '--']);
});

test('subgenre prefixes add marked Genres and Other sections sort independently', () => {
  const result = App.pivots.build([
    movie(1, { other: 'Zeta, Subgenre Time Travel, Subgenre:Loop, subgenre time travel', genres: ['Drama'], collections: ['Series'], starredCollections: ['Series'] }),
    movie(2, { other: 'Alpha, Subgenre Loop, Series', collections: ['Series'], starredCollections: ['Series'] })
  ]);
  assert.equal(result.groups.genres.find(row => row.name === 'Time Travel *').count, 1);
  assert.equal(result.groups.genres.find(row => row.name === 'Loop *').count, 2);
  assert.equal(result.groups.other.find(row => row.name === 'Series').count, 2);
  const rows = App.pivots.rows(result.groups.other, 1, 'category', 'asc');
  assert.deepEqual(Array.from(rows, row => row.name), ['Alpha', 'Zeta', 'Loop', 'Time Travel', 'Series']);
  assert.deepEqual(Array.from(rows, row => row.section), ['Others', 'Others', 'Subgenres', 'Subgenres', 'Collections']);
  for (const sort of ['count', 'average']) for (const direction of ['asc', 'desc']) {
    assert.deepEqual(Array.from(App.pivots.rows(result.groups.other, 1, sort, direction), row => row.section), ['Others', 'Others', 'Subgenres', 'Subgenres', 'Collections']);
  }
});
