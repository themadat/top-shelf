import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
const context = vm.createContext({ window: {}, TextEncoder, structuredClone });
for (const file of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tv.js', 'core/tv-import.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + file, import.meta.url), 'utf8'), context);
const A = context.window.LocalApp, importer = A.tvImport;
vm.runInContext(readFileSync(new URL('../assets/js/core/state.js', import.meta.url), 'utf8'), context);
const file = shows => ({ format: 'top-shelf-tv-import', version: 1, shows });
const row = (title, extra = {}) => ({ title, rating: 0, status: 'Completed', notes: '', ...extra });

test('TV bulk import preserves zero and unrated, with explicit source activity and viewing status', () => {
  const data = file([row('An active show', { rating: 5, status: 'Caught Up', seriesStatus: 'Active', notes: 'Source service: Prime' }), row('Terrible show'), row('Tried show', { rating: null, status: 'Stopped' })]);
  const p = importer.preview([], data), result = importer.apply([], data, p.snapshot, p.entries.map(e => e.show.id));
  assert.equal(result.count, 3); assert.equal(result.shows[1].rating, 0); assert.equal(result.shows[2].rating, null);
  assert.equal(result.shows[2].status, 'Stopped'); assert.equal(result.shows[0].notes, 'Source service: Prime');
  assert.equal(A.tv.seriesStatus(result.shows[0]), 'Active'); assert.equal(result.shows[0].tmdbId, null); assert.equal(result.shows[0].fetchedAt, '');
  assert.equal(A.tv.seriesStatus(result.shows[1]), 'Unknown');
  const linked = A.tv.refresh(result.shows[0], A.tv.normalize({ tmdbId: 22, title: 'An active show', providerStatus: 'Ended', inProduction: false }));
  assert.equal(A.tv.seriesStatus(linked), 'Ended'); assert.equal(linked.rating, 5); assert.equal(linked.status, 'Caught Up');
});

test('bulk import skips existing titles/IDs and prior import tombstones, preserving existing personal data', () => {
  const existing = [A.tv.normalize({ id: 'old', title: 'Existing Show', rating: 5, notes: 'Keep', tmdbId: 12 }), A.tv.normalize({ id: 'other', title: 'Different title', tmdbId: 34 })];
  const data = file([row(' existing   show ', { rating: 1 }), row('Renamed', { tmdbId: 34 }), row('New Show')]);
  const p = importer.preview(existing, data); assert.equal(p.entries.filter(e => e.skip).length, 2);
  const result = importer.apply(existing, data, p.snapshot, p.entries.map(e => e.show.id));
  assert.equal(result.count, 1); assert.equal(result.shows[0].rating, 5); assert.equal(result.shows[0].notes, 'Keep');
  assert.equal(importer.preview(result.shows, data).entries.filter(e => !e.skip).length, 0);
  const deleted = [{ id: p.entries[2].show.id, deleted: true, tmdbId: null }];
  assert.equal(importer.preview(deleted, file([row('New Show')])).entries[0].skip, true);
});

test('re-import links an ID to an existing title without replacing personal data', () => {
  const existing = [A.tv.normalize({ id: 'manual', title: 'Existing Show', rating: 5, status: 'Stopped', mode: 'Episode', notes: 'Keep', seasons: [{ number: 1, rating: 9 }] })];
  const data = file([row('Existing Show', { tmdbId: 123, rating: 1, status: 'Watching', notes: 'Replace' })]);
  const p = importer.preview(existing, data); assert.equal(p.entries[0].action, 'link'); assert.equal(p.entries[0].skip, false);
  const result = importer.apply(existing, data, p.snapshot, [p.entries[0].show.id]);
  assert.equal(result.count, 0); assert.equal(result.linked, 1); assert.equal(result.shows.length, 1); assert.equal(result.shows[0].tmdbId, 123);
  assert.equal(result.shows[0].rating, 5); assert.equal(result.shows[0].status, 'Stopped'); assert.equal(result.shows[0].mode, 'Episode');
  assert.equal(result.shows[0].notes, 'Keep'); assert.equal(result.shows[0].seasons[0].rating, 9);
  assert.equal(importer.preview(result.shows, data).entries[0].skip, true);
});

test('bulk import validates before applying, blocks stale previews and respects row selections', () => {
  const data = file([row('One'), row('Two')]), p = importer.preview([], data);
  const result = importer.apply([], data, p.snapshot, [p.entries[1].show.id]);
  assert.equal(result.shows.length, 1); assert.equal(result.shows[0].title, 'Two');
  assert.throws(() => importer.apply(result.shows, data, p.snapshot, [p.entries[0].show.id]), /changed/);
  assert.throws(() => importer.apply([], data, p.snapshot, []), /Select/);
  assert.throws(() => importer.preview([], file([row('One'), row('ONE')])), /duplicate/);
  assert.throws(() => importer.preview([], file([row('One', { tmdbId: 1 }), row('Two', { tmdbId: 1 })])), /duplicate/);
  for (const bad of [row(''), row('Bad', { rating: -1 }), row('Bad', { rating: '0' }), row('Bad', { rating: 5.5 }), row('Bad', { status: 'Unclear' }), row('Bad', { tmdbId: '1' }), row('Bad', { seriesStatus: 'Ended' }), row('Bad', { notes: ['not text'] })]) assert.throws(() => importer.preview([], file([bad])));
  const linkedActive = importer.preview([], file([row('Linked active', { tmdbId: 99, seriesStatus: 'Active' })])).entries[0].show;
  assert.equal(linkedActive.tmdbId, 99); assert.equal(A.tv.seriesStatus(linkedActive), 'Active');
  assert.throws(() => importer.preview([], { format: 'top-shelf-backup', version: 1, shows: [] }), /TV import/);
  assert.throws(() => A.stateModel.prepare(data), /Use TV → Import Shows/);
  const before = JSON.stringify(data); importer.preview([], data); assert.equal(JSON.stringify(data), before);
});
