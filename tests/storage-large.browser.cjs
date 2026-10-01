// Fresh profile, synthetic library, mocked GitHub; no live credentials or requests.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 404, body: '{}' }));
    await page.goto(process.env.STORAGE_TEST_URL || 'http://localhost:8000');
    await page.waitForSelector('html.app-ready');
    const result = await page.evaluate(async () => {
      const a = window.LocalApp, s = a.utils.clone(a.storage.getState());
      const review = 'Personal review: café 🎬, characters, story and photography. '.repeat(330).slice(0, 19000);
      s.workspace.movies = Array.from({ length: 400 }, (_, i) => a.movies.normalize({ id: 'large-' + i, tmdbId: i + 1, title: 'Synthetic movie ' + i, status: 'watched', rating: 4, review }));
      const json = JSON.stringify(s);
      let quotaRejected = false;
      try { localStorage.setItem('large-library-probe', json); }
      catch (error) { quotaRejected = error.name === 'QuotaExceededError'; }
      finally { localStorage.removeItem('large-library-probe'); }
      const payload = JSON.stringify(a.stateModel.syncPayload(s));
      const bytes = new TextEncoder().encode(payload), chunks = [];
      for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
      const content = btoa(chunks.join(''));
      window.fetch = async () => new Response(JSON.stringify({ type: 'file', sha: 'synthetic-sha', encoding: 'base64', content }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      a.storage.setSecret('synthetic-test-token', false);
      a.components.confirm = async () => true;
      // Exercise the explicit pull even when recovery cannot be saved.
      const recovery = a.storage.saveRecoveryAsync;
      a.storage.saveRecoveryAsync = async () => false;
      let success;
      try { success = await a.sync.restoreFromCloud(); }
      finally { a.storage.saveRecoveryAsync = recovery; }
      const raw = localStorage.getItem(a.config.storage.stateKey);
      return { quotaRejected, success, state: a.sync.getInfo().state, count: a.storage.getState().workspace.movies.length, review: a.storage.getState().workspace.movies[0].review, expectedReview: review, rawLength: json.length, storedLength: raw.length, compact: JSON.parse(raw).storageEncoding };
    });
    assert.equal(result.quotaRejected, true);
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(result.count, 400);
    assert.equal(result.review, result.expectedReview);
    assert.equal(result.compact, 'top-shelf-lzw16-v1');
    assert.ok(result.storedLength < result.rawLength / 3);
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.movies.length), 400);
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.movies[0].review), result.expectedReview);
    assert.equal(await page.evaluate(() => {
      const a = window.LocalApp;
      a.storage.mutate(s => { s.workspace.movies[0].review = 'Edited after reload: 中文 🎬'; });
      return a.storage.saveNow();
    }), true);
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.movies[0].review), 'Edited after reload: 中文 🎬');
    const exported = await page.evaluate(() => {
      const a = window.LocalApp, s = a.storage.getState();
      return { backup: a.stateModel.prepare(a.stateModel.exportEnvelope(s)).state.workspace.movies.length, cloud: a.stateModel.prepareSync(a.stateModel.syncPayload(s)).state.workspace.movies.length };
    });
    assert.deepEqual(exported, { backup: 400, cloud: 400 });
    assert.deepEqual(errors, []);
    console.log('Browser: real quota exceeded, mocked explicit pull succeeded without recovery; ' + result.rawLength + ' JSON characters stored in ' + result.storedLength + ' characters. Reload, edits, backup and sync round trips passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
