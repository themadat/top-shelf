import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

test('US streaming lookup excludes purchases, deduplicates providers, and uses the watch-provider endpoint', async () => {
  const calls = [];
  const context = vm.createContext({ window: {}, URL, AbortController, DOMException, setTimeout, clearTimeout, navigator: { onLine: true }, localStorage: { getItem: () => 'test-token' }, sessionStorage: { getItem: () => null }, fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ results: { US: { flatrate: [{ provider_name: 'Stream A' }], free: [{ provider_name: 'Stream A' }, { provider_name: 'Free B' }], ads: [{ provider_name: 'Ads C' }], rent: [{ provider_name: 'Rent D' }] }, GB: { flatrate: [{ provider_name: 'UK Only' }] } } }) }; } });
  for (const path of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tmdb.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
  const api = context.window.LocalApp.tmdb;
  assert.equal(await api.streaming(123), 'Stream A, Free B (free), Ads C (ads)');
  assert.equal(new URL(calls[0].url).pathname, '/3/movie/123/watch/providers');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(api.streamingNames({ results: {} }), '');
  assert.equal(api.streamingNames({ results: { US: { rent: [{ provider_name: 'Rental' }] } } }), '');
  assert.throws(() => api.streamingNames({ results: { US: { flatrate: {} } } }), /invalid/);
  await assert.rejects(() => api.streaming('bad'), /numeric/);
});

test('raw response access preserves unused properties while retaining mapped APIs', async () => {
  const raw = { id: 123, title: 'Sample', budget: 1000, tagline: '<Interesting>', credits: { cast: [], crew: [] } };
  const context = vm.createContext({ window: {}, URL, AbortController, DOMException, setTimeout, clearTimeout, navigator: { onLine: true }, localStorage: { getItem: () => 'test-token' }, sessionStorage: { getItem: () => null }, fetch: async () => ({ ok: true, json: async () => raw }) });
  for (const path of ['config.js', 'core/utils.js', 'core/movies.js', 'core/tmdb.js']) vm.runInContext(readFileSync(new URL('../assets/js/' + path, import.meta.url), 'utf8'), context);
  const api = context.window.LocalApp.tmdb;
  const result = await api.detailsResponse(123);
  assert.equal(result.movie.title, 'Sample');
  assert.equal(result.raw.budget, 1000);
  assert.equal(result.raw.tagline, '<Interesting>');
  assert.equal(result.movie.budget, undefined);
  assert.equal((await api.details(123)).tmdbId, 123);
});
