// Synthetic shows and mocked TMDB in an isolated browser profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let holdSeason = false, releaseSeason, seasonRequested;
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 404, json: {} }));
    await page.route('https://api.themoviedb.org/**', async route => {
      if (route.request().url().includes('/season/')) {
        if (holdSeason) { seasonRequested?.(); await new Promise(resolve => { releaseSeason = resolve; }); }
        return route.fulfill({ json: { id: 71, season_number: 1, name: 'Season 1', episodes: [
          { id: 91, episode_number: 1, name: 'Pilot', air_date: '2020-01-01' },
          { id: 92, episode_number: 2, name: 'New episode', air_date: '2020-01-02' },
          { id: 93, episode_number: 3, name: 'Future episode', air_date: '2099-01-01' }
        ] } });
      }
      return route.fulfill({ json: { id: 123, name: 'Progress Example', status: 'Returning Series', in_production: true, seasons: [{ id: 71, season_number: 1, name: 'Season 1', episode_count: 3, air_date: '2020-01-01' }] } });
    });
    await page.goto(process.env.TV_TEST_URL || 'http://localhost:8000');
    await page.waitForSelector('html.app-ready');
    await page.evaluate(() => {
      const a = window.LocalApp, state = a.utils.clone(a.storage.getState());
      state.workspace.tvShows = [a.tv.normalize({ id: 'progress', tmdbId: 123, title: 'Progress Example', status: 'Caught Up', lastWatched: 'S1 E1', seasons: [{ tmdbId: 71, number: 1, loaded: true, episodeCount: 1, episodes: [{ tmdbId: 91, number: 1, title: 'Pilot', airDate: '2020-01-01', rating: 8, notes: 'Keep my notes', watched: true }] }] })];
      state.ui.selectedShelf = 'tv';
      a.storage.replace(state, { saveRecovery: false, reason: 'import' });
      a.tmdb.saveToken('synthetic-test-token', false);
      a.tvUI.render();
    });
    const row = page.locator('[data-tv-id="progress"]');
    const open = async () => { await row.locator('[data-tv-open]').first().click(); await page.waitForSelector('#tvDialog[open]'); };
    const save = async () => { await page.getByRole('button', { name: 'Save Show', exact: true }).click(); await page.waitForSelector('#tvDialog:not([open])', { state: 'attached' }); };
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Caught Up');
    await page.evaluate(() => {
      const a = window.LocalApp;
      a.storage.mutate(s => { const show = s.workspace.tvShows[0]; show.lastWatched = ''; show.seasons[0].episodes[0].rating = null; show.seasons[0].episodes[0].watched = false; }, { reason: 'tv-test' });
    });
    assert.equal(await row.locator('[data-tv-advance="one"]').isEnabled(), true);
    assert.equal(await row.locator('[data-tv-advance="all"]').isEnabled(), true);
    await row.locator('[data-tv-advance="one"]').click();
    assert.equal(await row.locator('.tv-watched-episode').innerText(), 'S1 E1');
    await page.evaluate(() => {
      const a = window.LocalApp;
      a.storage.mutate(s => { const show = s.workspace.tvShows[0]; show.lastWatched = ''; show.seasons[0].episodes[0].rating = 8; show.seasons[0].episodes[0].watched = true; }, { reason: 'tv-test' });
    });
    await row.locator('[data-tv-advance="all"]').click();

    await page.locator('#tvRefresh').click();
    await page.waitForFunction(() => document.querySelector('#tvBatchStatus').textContent.includes('1 of 1 shows refreshed'));
    assert.equal(await row.locator('.tv-behind').innerText(), '-1');
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Watching');
    assert.deepEqual(await page.locator('#tvTable thead [data-tv-sort]').allTextContents(), ['#', 'Ave', 'Show ↑', 'Networks', 'My Status', 'Status', 'S', 'E', 'Last Air', 'Latest', 'Progress', 'Type', 'Genres', 'Notes']);
    assert.equal(await row.locator('td').nth(9).innerText(), 'S1 E2');
    assert.equal(await row.locator('[data-tv-advance="one"]').isEnabled(), true);
    await row.locator('[data-tv-advance="one"]').click();
    assert.equal(await row.locator('.tv-caught-up').getAttribute('aria-label'), 'Caught up');
    assert.equal(await row.locator('[data-tv-advance="one"]').isEnabled(), true);
    await open(); await page.locator('#tvLastWatched').fill('S1 E1'); await save();
    await row.locator('[data-tv-advance="all"]').click();
    assert.match(await row.locator('.tv-watched-episode').innerText(), /S1 E2/);
    assert.equal(await row.locator('.tv-caught-up').count(), 1);
    await open(); await page.locator('#tvLastWatched').fill('S1 E1'); await save();
    for (const key of ['numberOfSeasons', 'numberOfEpisodes']) assert.ok(await page.locator('[data-tv-col="' + key + '"]').evaluate(el => parseFloat(el.style.width)) < 65);
    await page.locator('[data-tv-sort="latestEpisode"]').click();
    await page.locator('[data-tv-sort="progress"]').click();
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await page.locator('[data-tv-sort="progress"]').innerText(), 'Progress ↑');

    await row.locator('[data-tv-advance="all"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/top-shelf-tv-progress-columns.png' });
    await page.locator('#tvFilter').selectOption('Caught Up');
    assert.equal(await page.locator('[data-tv-id="progress"]').count(), 0);
    await page.locator('#tvFilter').selectOption('Watching');
    assert.equal(await row.count(), 1);
    await page.locator('#tvFilter').selectOption('all');
    await open();
    assert.match(await page.locator('#tvProgress').innerText(), /1 new aired episode.*Shown as Watching/);
    await page.locator('.tv-season > summary').click();
    await page.getByRole('button', { name: 'Watched through season 1 episode 2', exact: true }).click();
    assert.equal(await page.locator('#tvLastWatched').inputValue(), 'S1 E2');
    await save();
    assert.equal(await row.locator('.tv-behind').count(), 0);
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Caught Up');
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.match(await row.locator('.tv-watched-episode').innerText(), /S1 E2/);
    await open();
    const requested = new Promise(resolve => { seasonRequested = resolve; }); holdSeason = true;
    await page.locator('#tvCheckEpisodes').click(); await requested;
    await page.locator('#tvLastWatched').fill('S1 E1');
    holdSeason = false; releaseSeason();
    await page.waitForFunction(() => document.querySelector('#tvEditorStatus').textContent.includes('draft changed'));
    assert.equal(await page.locator('#tvLastWatched').inputValue(), 'S1 E1');
    await page.locator('.tv-season > summary').click();
    const noteRequest = new Promise(resolve => { seasonRequested = resolve; }); holdSeason = true;
    await page.locator('#tvCheckEpisodes').click(); await noteRequest;
    await page.locator('[data-episode-notes][data-episode="id-91"]').fill('Edited during check');
    holdSeason = false; releaseSeason();
    await page.waitForFunction(() => !document.querySelector('#tvForm').hasAttribute('aria-busy'));
    assert.match(await page.locator('#tvEditorStatus').innerText(), /draft changed/);
    assert.equal(await page.locator('[data-episode-notes][data-episode="id-91"]').inputValue(), 'Edited during check');
    await save();
    await context.setOffline(true);
    await open();
    await page.locator('#tvLastWatched').fill('S1 E2'); await save();
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Caught Up');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await open();
      assert.equal(await page.locator('#tvLastWatched').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#tvDialog').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      if (width === 390) await page.screenshot({ path: '/tmp/top-shelf-tv-progress-mobile.png' });
      await save();
    }
    const saved = await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0]);
    assert.equal(saved.seasons[0].episodes[0].rating, 8);
    assert.equal(saved.seasons[0].episodes[0].notes, 'Edited during check');
    assert.equal(saved.lastWatched, 'S1 E2');
    await context.setOffline(false);
    const overQuota = await page.evaluate(() => {
      const a = window.LocalApp, state = a.utils.clone(a.storage.getState());
      a.storage.saveRecovery('Legacy recovery fixture');
      const review = 'Synthetic storage pressure review café 🎬. '.repeat(500).slice(0, 19000);
      state.workspace.movies = Array.from({ length: 400 }, (_, i) => a.movies.normalize({ id: 'pressure-' + i, tmdbId: i + 1, rating: 4, title: 'Storage fixture ' + i, status: 'watched', review }));
      let rejected = false;
      try { localStorage.setItem('tv-recovery-quota-probe', JSON.stringify(state)); } catch (e) { rejected = e.name === 'QuotaExceededError'; } finally { localStorage.removeItem('tv-recovery-quota-probe'); }
      a.storage.replace(state, { saveRecovery: false, reason: 'import' });
      return rejected;
    });
    assert.equal(overQuota, true, 'the full uncompressed snapshot exceeds real localStorage quota');
    await page.locator('#tvRefresh').click();
    await page.waitForFunction(() => document.querySelector('#tvBatchStatus').textContent.includes('1 of 1 shows refreshed'));
    const recovery = await page.evaluate(() => {
      const a = window.LocalApp;
      return { reason: a.storage.recoveryInfo().reason, localRecovery: localStorage.getItem(a.config.storage.recoveryKey), movies: a.storage.getState().workspace.movies.length, watched: a.storage.getState().workspace.tvShows[0].lastWatched };
    });
    assert.equal(recovery.reason, 'Before refreshing all TV shows'); assert.equal(recovery.localRecovery, null);
    assert.equal(recovery.movies, 400); assert.equal(recovery.watched, 'S1 E2');
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.movies.length), 400);
    // A failed per-show write must not publish an unsaved refresh or increment the success count.
    await page.evaluate(() => {
      const a = window.LocalApp;
      window.tvBeforeFailedWrite = a.utils.stableJson(a.storage.getState().workspace.tvShows);
      window.tvReplace = a.storage.replace;
      a.storage.replace = () => { throw new Error('Synthetic storage full'); };
    });
    await page.locator('#tvRefresh').click();
    await page.waitForFunction(() => document.querySelector('#tvBatchStatus').textContent.includes('Synthetic storage full'));
    assert.match(await page.locator('#tvBatchStatus').innerText(), /0 of 1 shows refreshed/);
    assert.equal(await page.evaluate(() => {
      const a = window.LocalApp; a.storage.replace = window.tvReplace;
      return a.utils.stableJson(a.storage.getState().workspace.tvShows) === window.tvBeforeFailedWrite;
    }), true);
    assert.deepEqual(errors, []);
    console.log('TV progress browser checks passed: refresh, highlights, status filters, episode selection, stale draft, offline reload and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
