import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function harness(fetch = async () => { throw new Error('Unexpected request'); }) {
  const context = vm.createContext({ window: {}, URL, TextEncoder, TextDecoder, Uint8Array, structuredClone, AbortController, DOMException, setTimeout, clearTimeout, navigator: { onLine: true }, localStorage: { getItem: () => 'private-token' }, sessionStorage: { getItem: () => null }, fetch });
  for (const path of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/books.js', 'core/tmdb.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
  const App = context.window.LocalApp;
  App.utils.sanitizeRichHtml = String; App.utils.richTextToPlainText = String;
  vm.runInContext(readFileSync(new URL('../assets/js/core/state.js', import.meta.url), 'utf8'), context);
  return App;
}
const App = harness(), tv = App.tv, model = App.stateModel;
const show = (extra = {}) => tv.normalize({ id: 'tv-one', title: 'Example', tmdbId: 123, ...extra });
const series = () => ({ id: 123, name: 'Example', status: 'Returning Series', in_production: true, type: 'Scripted', first_air_date: '2020-01-02', last_air_date: '2024-03-04', number_of_seasons: 4, number_of_episodes: 38, vote_average: 8.25, genres: [{ name: 'Drama' }], networks: [{ name: 'Network' }], production_companies: [{ name: 'Studio' }], seasons: [{ id: 71, season_number: 1, name: 'Season 1', episode_count: 3 }] });
const season = () => ({ id: 71, season_number: 1, name: 'Season 1', episodes: [{ id: 91, episode_number: 1, name: 'Pilot', air_date: '2020-01-02' }, { id: 92, episode_number: 2, name: 'Second' }] });

test('TV scales preserve zero, blanks, whole numbers and exact labels', () => {
  assert.equal(show({ rating: 0 }).rating, 0);
  for (const r of [undefined, null, '']) assert.equal(show({ rating: r }).rating, null);
  for (const r of [-1, 6, 1.5, '3', NaN]) assert.throws(() => show({ rating: r }), /rating/);
  for (const r of [0, 11, 5.5]) assert.throws(() => show({ seasons: [{ number: 1, rating: r }] }), /rating/);
  assert.equal(tv.showLabels[5], 'Legendary'); assert.equal(tv.showLabels[0], 'Terrible');
  assert.equal(tv.episodeLabels[1], 'Did not Finish'); assert.equal(tv.episodeLabels[10], 'Best of the Best');
});

test('TV averages are independent, include DNF and exclude specials and blanks', () => {
  const s = show({ rating: 5, seasons: [{ number: 0, rating: 10, episodes: [{ number: 1, rating: 10 }] }, { number: 1, rating: 8, episodes: [{ number: 1, rating: 9 }, { number: 2, rating: 1 }, { number: 3, watched: true }] }, { number: 2, episodes: [] }] });
  const a = tv.averages(s);
  assert.equal(a.seasons.value, 8); assert.equal(a.seasons.count, 1); assert.equal(a.seasons.total, 2);
  assert.equal(a.episodes.value, 5); assert.equal(a.episodes.count, 2); assert.equal(a.episodes.total, 3);
  s.mode = 'Episode'; s.status = 'Stopped';
  const updated = tv.normalize(s); assert.equal(updated.rating, 5); assert.equal(updated.seasons[1].rating, 8); assert.equal(updated.seasons[1].episodes[1].rating, 1);
});

test('series activity never infers cancellation or personal viewing state', () => {
  for (const [raw, flag, expected] of [['Returning Series', true, 'Active'], ['In Production', null, 'Active'], ['Ended', false, 'Ended'], ['Canceled', false, 'Canceled'], ['Planned', false, 'Upcoming'], ['Pilot', null, 'Upcoming'], ['', false, 'Unknown'], ['Mystery', true, 'Unknown'], ['Ended', true, 'Unknown'], ['Returning Series', false, 'Unknown']]) {
    const s = show({ providerStatus: raw, inProduction: flag, status: 'Completed' });
    assert.equal(tv.seriesStatus(s), expected); assert.equal(s.status, 'Completed');
  }
});

test('refresh matches stable IDs through renumbering and preserves removed ratings', () => {
  const old = show({ rating: 4, status: 'Stopped', mode: 'Episode', notes: 'Keep me', lastWatched: 'S1 E2', seasons: [{ tmdbId: 71, number: 1, rating: 9, loaded: true, episodes: [{ tmdbId: 91, number: 1, rating: 7, watched: true }, { tmdbId: 92, number: 2, rating: 1 }] }] });
  const raw = series(); raw.seasons[0].season_number = 2;
  const refreshed = tv.refresh(old, tv.fromTmdb(raw));
  assert.equal(refreshed.firstAirDate, '2020-01-02'); assert.equal(refreshed.lastAirDate, '2024-03-04'); assert.equal(refreshed.type, 'Scripted');
  assert.equal(refreshed.numberOfSeasons, 4); assert.equal(refreshed.numberOfEpisodes, 38); assert.equal(refreshed.voteAverage, 8.25);
  assert.equal(refreshed.seasons[0].number, 2); assert.equal(refreshed.seasons[0].rating, 9); assert.equal(refreshed.seasons[0].episodes[0].rating, 7);
  for (const key of ['id', 'rating', 'status', 'mode', 'notes', 'lastWatched']) assert.equal(refreshed[key], old[key]);
  const response = season(); response.season_number = 2; response.episodes = [{ id: 91, episode_number: 2, name: 'Renumbered' }, { id: 93, episode_number: 1, name: 'New pilot' }];
  const merged = tv.mergeSeason(refreshed.seasons[0], tv.seasonFromTmdb(response));
  assert.equal(merged.episodes.find(e => e.tmdbId === 91).rating, 7);
  assert.equal(merged.episodes.find(e => e.tmdbId === 92).orphaned, true);
  assert.equal(merged.episodes.find(e => e.tmdbId === 92).rating, 1);
  assert.equal(merged.episodes.find(e => e.tmdbId === 93).rating, null);
  const removed = tv.refresh(old, tv.fromTmdb({ ...series(), seasons: [] }));
  assert.equal(removed.seasons[0].orphaned, true); assert.equal(removed.seasons[0].episodes.length, 2);
  assert.throws(() => tv.refresh(old, tv.fromTmdb({ ...series(), id: 999 })), /different/);
});

test('manual seasons and episodes can be linked without losing scores', () => {
  const old = show({ tmdbId: null, seasons: [{ number: 1, rating: 8, episodes: [{ number: 1, rating: 6, watched: true }] }] });
  const linked = tv.refresh(old, tv.fromTmdb(series()));
  const loaded = tv.mergeSeason(linked.seasons[0], tv.seasonFromTmdb(season()));
  assert.equal(linked.tmdbId, 123); assert.equal(loaded.tmdbId, 71);
  assert.equal(loaded.rating, 8); assert.equal(loaded.episodes[0].tmdbId, 91); assert.equal(loaded.episodes[0].rating, 6);
});

test('TV validation rejects duplicate identities, malformed collections and oversized nested data', () => {
  assert.throws(() => tv.normalizeList([show(), show({ id: 'tv-two' })]), /Duplicate TMDB/);
  assert.throws(() => tv.normalizeList([show(), show({ tmdbId: 124 })]), /Duplicate TV/);
  assert.equal(tv.normalizeList([show(), { id: 'tv-old', tmdbId: 123, deleted: true }]).length, 2);
  for (const input of [[{}], [{ id: 'bad', tmdbId: 'abc' }], {}]) assert.throws(() => tv.normalizeList(input));
  assert.throws(() => show({ seasons: [{ number: 1 }, { number: 1 }] }), /Duplicate season/);
  assert.throws(() => show({ seasons: [{ number: 1, episodes: [{ number: 1, tmdbId: 5 }, { number: 2, tmdbId: 5 }] }] }), /Duplicate episode/);
  assert.throws(() => show({ seasons: Array(501).fill({ number: 1 }) }), /limit/);
  assert.throws(() => show({ seasons: [{ number: 1, episodes: Array(5001).fill({ number: 1 }) }] }), /limit/);
  assert.throws(() => tv.normalizeList(Array.from({ length: 300 }, (_, i) => show({ id: 'tv-' + i, tmdbId: null, notes: 'x'.repeat(20000) }))), /size limit/);
});

test('TV migrates old local/cloud data and round trips full backups with local preferences', () => {
  const old = model.createDefaultState(); old.schemaVersion = 6; delete old.workspace.tvShows;
  old.workspace.documents = [{ id: 'app-notes', html: 'Preserve notes' }];
  const migrated = model.prepare(old); assert.equal(migrated.state.workspace.tvShows.length, 0); assert.equal(migrated.state.workspace.documents[0].html, 'Preserve notes');
  assert.ok(migrated.migrations.includes('6→7'));
  const priorCloud = model.prepareSync({ syncFormat: 'top-shelf-app-data', syncVersion: 5, schemaVersion: 9, data: { notes: 'Old cloud' } });
  assert.equal(priorCloud.state.workspace.tvShows.length, 0); assert.equal(priorCloud.legacy, true);
  const state = model.normalize({ workspace: { tvShows: [show({ rating: 0, seasons: [{ number: 1, rating: 10, episodes: [{ number: 1, rating: 1 }] }] })] }, ui: { tv: { sort: 'rating', direction: 'desc', widths: { title: 360 }, query: 'abc', filter: 'Stopped' } } });
  const round = model.prepare(model.exportEnvelope(state)).state;
  assert.equal(round.workspace.tvShows[0].rating, 0); assert.equal(round.workspace.tvShows[0].seasons[0].episodes[0].rating, 1);
  assert.equal(round.ui.tv.widths.title, 360); assert.equal(round.ui.tv.sort, 'rating');
  assert.equal(model.resetPreferences(round).ui.tv.sort, 'title');
  assert.equal(model.resetPreferences(round).workspace.tvShows.length, 1);
  assert.equal(JSON.stringify(model.syncPayload(round)).includes('private-token'), false);
});

test('TV sync fingerprints ignore device preferences and check timestamps', () => {
  const state = model.normalize({ workspace: { tvShows: [show({ fetchedAt: '2026-01-01T00:00:00.000Z', seasons: [{ number: 1, fetchedAt: '2026-01-01T00:00:00.000Z' }] })] } });
  const hash = model.syncHash(state);
  state.ui.tv.widths.title = 400; state.ui.tv.query = 'foo'; state.ui.tv.sort = 'rating';
  state.workspace.tvShows[0].fetchedAt = '2026-09-28T00:00:00.000Z'; state.workspace.tvShows[0].seasons[0].fetchedAt = '2026-09-28T00:00:00.000Z';
  assert.equal(model.syncHash(state), hash);
  assert.equal(model.syncHash(model.prepareSync(model.syncPayload(state)).state), hash);
  state.workspace.tvShows[0].rating = 0; assert.notEqual(model.syncHash(state), hash);
  const payload = model.syncPayload(state); assert.equal(payload.syncVersion, 7); assert.equal(payload.schemaVersion, 11);
  assert.throws(() => model.prepareSync({ ...payload, syncVersion: 5, schemaVersion: 9 }), /invalid/);
});

test('TV sync merges disjoint shows and rejects same-show and deletion conflicts', () => {
  const local = model.normalize({ workspace: { tvShows: [show()] } });
  const remote = model.normalize({ workspace: { tvShows: [show({ id: 'tv-two', tmdbId: 234, title: 'Second' })] } });
  assert.equal(model.merge(local, remote).workspace.tvShows.length, 2);
  const edited = structuredClone(local); edited.workspace.tvShows[0].notes = 'Concurrent edit';
  assert.equal(model.canMerge(local, edited), false);
  const deleted = model.normalize({ workspace: { tvShows: [{ id: 'tv-one', tmdbId: 123, deleted: true }] } });
  assert.equal(model.canMerge(local, deleted), false);
  const sameProvider = model.normalize({ workspace: { tvShows: [show({ id: 'another-id' })] } });
  assert.equal(model.canMerge(local, sameProvider), false);
  assert.equal(model.applySync(local, remote).workspace.tvShows[0].id, 'tv-two');
});

test('TV cloud fingerprints are stable when collection ordering changes', () => {
  const one = show({ seasons: [{ number: 2 }, { number: 1, episodes: [{ number: 2, rating: 8 }, { number: 1, rating: 6 }] }] });
  const state = model.normalize({ workspace: { tvShows: [one, show({ id: 'tv-two', tmdbId: 234 })] } });
  const hash = model.syncHash(state);
  state.workspace.tvShows[0].seasons[1].episodes.reverse();
  state.workspace.tvShows[0].seasons.reverse(); state.workspace.tvShows.reverse();
  assert.equal(model.syncHash(state), hash);
});

test('TV TMDB endpoints use shared bearer auth and compact mappings', async () => {
  const calls = [];
  const A = harness(async (url, options) => {
    calls.push({ url, options });
    const raw = url.includes('/search/tv') ? { results: [{ id: 123, name: 'Example' }] } : url.includes('/season/') ? season() : series();
    return { ok: true, json: async () => raw };
  });
  assert.equal((await A.tmdb.searchTv('Example')).length, 1);
  const s = await A.tmdb.tvDetails(123); assert.equal(s.tmdbId, 123); assert.equal(s.networks[0], 'Network'); assert.equal(s.seasons[0].loaded, false);
  const seasonData = await A.tmdb.tvSeason(123, 1); assert.equal(seasonData.episodes[0].tmdbId, 91); assert.equal(seasonData.loaded, true);
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/3/search/tv', '/3/tv/123', '/3/tv/123/season/1']);
  for (const c of calls) { assert.equal(c.options.headers.Authorization, 'Bearer private-token'); assert.equal(c.url.includes('private-token'), false); }
  await assert.rejects(() => A.tmdb.tvDetails('../movie/1'), /numeric/);
  await assert.rejects(() => A.tmdb.tvSeason(123, -1), /season number/);
});

test('TV lookup reports API errors, cancellation and wrong response identities', async () => {
  for (const status of [401, 429, 404]) {
    const A = harness(async () => ({ ok: false, status }));
    await assert.rejects(() => A.tmdb.tvDetails(123), status === 401 ? /token/ : status === 429 ? /busy/ : /entry/);
  }
  const A = harness(async () => ({ ok: true, json: async () => ({ ...series(), id: 999 }) }));
  await assert.rejects(() => A.tmdb.tvDetails(123), /different/);
  const B = harness(async (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
  const c = new AbortController(), pending = B.tmdb.tvDetails(123, c.signal); c.abort();
  await assert.rejects(() => pending, { name: 'AbortError' });
});


test('season rankings seed exact titles once, remain editable, and survive refresh and backup', () => {
  const dexter = show({ title: 'Dexter' });
  assert.equal(dexter.seasonRanking.split('\n').length, 8);
  assert.equal(dexter.seasonRanking.split('\n')[2], 'Season 4: Trinity');
  assert.equal(show({ title: 'The Wire' }).seasonRanking.split('\n')[0], 'Season 3: The Politics');
  assert.equal(show({ title: 'Dexter: New Blood' }).seasonRanking, '');
  assert.equal(show({ title: 'Dexter', seasonRanking: '' }).seasonRanking, '');
  const custom = show({ seasonRanking: 'Season 2: Favorite\nSeason 1: Next' });
  assert.equal(tv.refresh(custom, tv.fromTmdb(series())).seasonRanking, custom.seasonRanking);
  const state = model.createDefaultState(); state.workspace.tvShows = [custom];
  assert.equal(model.normalize(JSON.parse(JSON.stringify(state))).workspace.tvShows[0].seasonRanking, custom.seasonRanking);
});


test('Sherlock supplied episode ratings seed once, preserve existing scores, and keep specials separate', () => {
  const s = show({ title: 'Sherlock' });
  assert.equal(s.seasons.flatMap(x => x.episodes).length, 13);
  assert.deepEqual(Array.from(s.seasons, x => (x.episodes.reduce((n,e)=>n+e.rating,0)/x.episodes.length).toFixed(1)), ['8.0','6.7','7.7','8.3','7.0']);
  assert.equal(tv.averages(s).episodes.count, 12);
  s.seasons[1].episodes[0].rating = null;
  assert.equal(tv.normalize(s).seasons[1].episodes[0].rating, null);
  const existing = show({ title: 'Sherlock', seasons: [{ number: 1, episodes: [{ number: 1, rating: 3 }] }] });
  assert.equal(existing.seasons[1].episodes[0].rating, 3);
  assert.equal(tv.normalize({ ...s, deleted: true }).seasons, undefined);
  assert.equal(show({ title: 'Sherlock Holmes' }).seasons.length, 0);
});
