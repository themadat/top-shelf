// Synthetic shows and mocked TMDB in an isolated browser profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors = [], tmdbCalls = [];
    page.on('pageerror', error => errors.push(error.message));
    let holdSeason = false, releaseSeason, seasonRequested;
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 404, json: {} }));
    await page.route('https://api.themoviedb.org/**', async route => {
      tmdbCalls.push(new URL(route.request().url()).pathname);
      if (route.request().url().includes('/season/')) {
        if (holdSeason) { seasonRequested?.(); await new Promise(resolve => { releaseSeason = resolve; }); }
        return route.fulfill({ json: { id: 71, season_number: 1, name: 'Season 1', episodes: [
          { id: 91, episode_number: 1, name: 'Pilot', air_date: '2020-01-01' },
          { id: 92, episode_number: 2, name: 'New episode', air_date: '2020-01-02' },
          { id: 93, episode_number: 3, name: 'Future episode', air_date: '2099-01-01' }
        ] } });
      }
      return route.fulfill({ json: { id: 123, name: 'Progress Example', status: 'Returning Series', in_production: true, seasons: [{ id: 71, season_number: 1, name: 'Season 1', episode_count: 3, air_date: '2020-01-01' }, { id: 72, season_number: 2, name: 'Placeholder', episode_count: 0, air_date: '2020-02-01' }] } });
    });
    await page.goto(process.env.TV_TEST_URL || 'http://localhost:8000');
    await page.waitForSelector('html.app-ready').catch(error => { throw new Error(error.message + '\nPage errors: ' + JSON.stringify(errors)); });
    await page.evaluate(() => {
      const a = window.LocalApp, state = a.utils.clone(a.storage.getState());
      state.workspace.tvShows = [a.tv.normalize({ id: 'progress', tmdbId: 123, title: 'Progress Example', rating: 4, status: 'Caught Up', lastWatched: 'S1 E1', seasons: [{ tmdbId: 71, number: 1, loaded: true, episodeCount: 1, episodes: [{ tmdbId: 91, number: 1, title: 'Pilot', airDate: '2020-01-01', rating: 8, notes: 'Keep my notes', watched: true }] }] })];
      state.ui.selectedShelf = 'tv';
      a.storage.replace(state, { saveRecovery: false, reason: 'import' });
      a.tmdb.saveToken('synthetic-test-token', false);
      a.tvUI.render();
    });
    const row = page.locator('[data-tv-id="progress"]');
    const setWatched = async (season, episode) => {
      await page.locator('#tvWatchedSeason').fill(String(season));
      await page.locator('#tvWatchedEpisode').fill(String(episode));
    };
    const watchedValue = async () => 'S' + await page.locator('#tvWatchedSeason').inputValue() + ' E' + await page.locator('#tvWatchedEpisode').inputValue();

    const open = async () => { await row.locator('[data-tv-open]').first().click(); await page.waitForSelector('#tvDialog[open]'); };
    const save = async () => { await page.getByRole('button', { name: 'Save Show', exact: true }).click(); await page.waitForSelector('#tvDialog:not([open])', { state: 'attached' }); };
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Caught Up');
    assert.equal(await row.locator('.tv-rating-select .movie-score').innerText(), '4.0');
    assert.match(await row.locator('[data-tv-edit="rating"] option[value="0"]').innerText(), /^0\.0 ·/);
    assert.match(await row.locator('[data-tv-edit="rating"] option[value="4"]').innerText(), /^4\.0 ·/);
    assert.match(await row.locator('[data-tv-edit="rating"] option[value="4.5"]').innerText(), /^4\.5 ·/);

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

    // The row refresh must affect only the selected linked show.
    const otherShows = await page.evaluate(() => {
      const a = window.LocalApp;
      a.storage.mutate(state => { state.ui.tv.widths.title = 80; state.ui.tv.widths.progress = 600; state.workspace.tvShows.push(a.tv.normalize({ id: 'other-linked', title: 'A Very Long Television Show Name That Must Remain Fully Visible Across The Whole Show Column', tmdbId: 456, lastWatched: 'S1 E3', seasons: [{ number: 1, episodeCount: 10 }, { number: 2, episodeCount: 8 }, { number: 3, loaded: true, episodes: [{ number: 1, airDate: '2020-01-01' }, { number: 2, airDate: '2020-01-02' }] }] }), a.tv.normalize({ id: 'manual', title: 'Manual show' })); }, { reason: 'tv-test' });
      a.storage.saveNow();
      return a.utils.stableJson(a.storage.getState().workspace.tvShows.filter(s => s.id !== 'progress'));
    });
    const longTitle = page.locator('[data-tv-id="other-linked"] .tv-show-cell > .tv-title-button');
    assert.equal(await longTitle.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    assert.equal(await page.locator('[data-tv-id="other-linked"] .tv-behind').innerText(), '-17');
    assert.ok(await page.locator('[data-tv-col="progress"]').evaluate(el => parseFloat(el.style.width)) < 220);
    assert.equal(await row.locator('[data-tv-advance="one"] svg').getAttribute('viewBox'), '0 0 24.1846 23.8281');
    assert.equal(await row.locator('[data-tv-advance="all"] svg').getAttribute('viewBox'), '0 0 24.1846 23.8281');
    assert.equal(await row.locator('[data-tv-refresh-id] svg').getAttribute('viewBox'), '0 0 26.6943 26.3477');
    assert.equal(await row.locator('.tv-show-actions a svg').getAttribute('viewBox'), '0 0 26.6943 26.3477');
    assert.equal(await row.locator('.tv-progress-cell').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.screenshot({ path: '/tmp/top-shelf-tv-new-icons.png' });
    const link = row.getByRole('link', { name: 'Open Progress Example on TMDB', exact: true });
    assert.equal(await link.getAttribute('href'), 'https://www.themoviedb.org/tv/123');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.match(await link.getAttribute('rel'), /noopener/);
    assert.equal(await page.locator('[data-tv-id="manual"] .tv-show-actions').count(), 0);
    assert.ok(await row.locator('.tv-show-cell').evaluate(el => Math.abs(el.getBoundingClientRect().right - el.querySelector('a').getBoundingClientRect().right) < 1));
    await context.route('https://www.themoviedb.org/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Mock TMDB page</title>' }));
    const popupPromise = page.waitForEvent('popup'); await link.click(); const popup = await popupPromise;
    await popup.waitForLoadState(); assert.equal(popup.url(), 'https://www.themoviedb.org/tv/123');
    assert.equal(await popup.evaluate(() => window.opener === null), true); await popup.close();
    await row.locator('[data-tv-refresh-id]').click();
    await page.waitForFunction(() => !document.querySelector('#tvRefresh').disabled);
    assert.match(await page.locator('#tvBatchStatus').innerText(), /1 of 1 shows refreshed/);
    assert.deepEqual(tmdbCalls, ['/3/tv/123', '/3/tv/123/season/1']);
    assert.equal(await page.locator('.tv-batch > :first-child').getAttribute('id'), 'tvStatusDismiss');
    await page.getByRole('button', { name: 'Dismiss TV status', exact: true }).click();
    assert.equal(await page.locator('#tvBatchStatus').innerText(), '');
    assert.equal(await page.locator('.tv-batch').isHidden(), true);

    assert.equal(await page.evaluate(() => {
      const a = window.LocalApp; return a.utils.stableJson(a.storage.getState().workspace.tvShows.filter(s => s.id !== 'progress'));
    }), otherShows);
    assert.equal(await row.locator('[data-tv-refresh-id]').isEnabled(), true);
    await page.evaluate(() => window.LocalApp.storage.mutate(state => { state.workspace.tvShows = state.workspace.tvShows.filter(s => s.id === 'progress'); }, { reason: 'tv-test' }));
    assert.equal(await row.locator('.tv-behind').innerText(), '-1');
    assert.ok(await row.locator('.tv-progress-cell').evaluate(el => {
      const badge = el.querySelector('.tv-behind').getBoundingClientRect(), actions = el.querySelector('.tv-progress-actions').getBoundingClientRect();
      return Math.abs(actions.left - badge.right - parseFloat(getComputedStyle(el).gap)) < 1;
    }));

    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Watching');
    assert.deepEqual(await page.locator('#tvTable thead [data-tv-sort]').allTextContents(), ['#', 'Ave', 'Show ↑', 'Networks', 'My Status', 'Status', 'S', 'E', 'Progress', 'Latest', 'Last Air', 'Type', 'Genres', 'Notes']);
    assert.equal(await row.locator('td').nth(9).innerText(), 'S1 E2');
    assert.equal(await row.locator('[data-tv-advance="one"]').isEnabled(), true);
    await row.locator('[data-tv-advance="one"]').click();
    assert.equal(await row.locator('.tv-caught-up').getAttribute('aria-label'), 'Caught up');
    assert.ok(await row.locator('.tv-progress-cell').evaluate(el => {
      const badge = el.querySelector('.tv-caught-up').getBoundingClientRect(), actions = el.querySelector('.tv-progress-actions').getBoundingClientRect();
      return Math.abs(actions.left - badge.right - parseFloat(getComputedStyle(el).gap)) < 1;
    }));

    assert.equal(await row.locator('[data-tv-advance="one"]').isEnabled(), true);
    await open(); await setWatched(1, 1); await save();
    await row.locator('[data-tv-advance="all"]').click();
    assert.match(await row.locator('.tv-watched-episode').innerText(), /S1 E2/);
    assert.equal(await row.locator('.tv-caught-up').count(), 1);
    await open(); await setWatched(1, 1); await save();
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
    await setWatched(1, '');
    assert.equal(await page.locator('#tvWatchedSeason').inputValue(), '1');
    assert.equal(await page.locator('#tvWatchedEpisode').inputValue(), '');
    assert.equal(await page.locator('#tvWatchedEpisode').evaluate(el => el.required), true);
    await page.getByRole('button', { name: 'Save Show', exact: true }).click();
    assert.equal(await page.locator('#tvDialog').evaluate(el => el.open), true);
    assert.equal(await page.locator('#tvWatchedEpisode').evaluate(el => el.validity.valueMissing), true);
    await page.locator('#tvCheckEpisodes').click();
    await page.waitForFunction(() => document.querySelector('#tvEditorStatus').textContent.includes('details refreshed'));
    assert.equal(await page.locator('#tvWatchedSeason').inputValue(), '1');
    assert.equal(await page.locator('#tvWatchedEpisode').inputValue(), '');
    assert.equal(await page.locator('#tvWatchedEpisode').evaluate(el => el.validity.valueMissing), true);

    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].lastWatched), 'S1 E1');
    await setWatched(1, 1);

    await page.locator('[data-season-key="id-71"] > summary').click();
    assert.equal(await page.locator('#tvShowRating [data-score="4"] strong').innerText(), '4.0');
    assert.match(await page.locator('[data-episode-rating][data-episode="id-91"] option[value="8"]').innerText(), /^8\.0 ·/);
    assert.equal(await page.locator('[data-episode-rating][data-episode="id-91"]').locator('..').locator('.movie-score').innerText(), '8.0');

    await page.getByRole('button', { name: 'Watched through season 1 episode 2', exact: true }).click();
    assert.equal(await watchedValue(), 'S1 E2');
    await save();
    assert.equal(await row.locator('.tv-behind').count(), 0);
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Caught Up');
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.match(await row.locator('.tv-watched-episode').innerText(), /S1 E2/);
    await open();
    const requested = new Promise(resolve => { seasonRequested = resolve; }); holdSeason = true;
    await page.locator('#tvCheckEpisodes').click(); await requested;
    await setWatched(1, 1);
    holdSeason = false; releaseSeason();
    await page.waitForFunction(() => document.querySelector('#tvEditorStatus').textContent.includes('draft changed'));
    assert.equal(await watchedValue(), 'S1 E1');
    await page.locator('[data-season-key="id-71"] > summary').click();
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
    await setWatched(1, 2); await save();
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await row.locator('[data-tv-edit="status"]').inputValue(), 'Caught Up');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 }); await open();
      assert.equal(await page.locator('#tvWatchedSeason').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('#tvDialog').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      if (width === 390) await page.screenshot({ path: '/tmp/top-shelf-tv-progress-mobile.png' });
      await save();
    }
    const saved = await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0]);
    assert.equal(saved.seasons[0].episodes[0].rating, 8);
    assert.equal(saved.seasons[0].episodes[0].notes, 'Edited during check');
    assert.equal(saved.lastWatched, 'S1 E2');
    await page.evaluate(() => window.LocalApp.storage.mutate(s => { s.workspace.tvShows[0].lastWatched = 'Legacy personal progress'; }, { reason: 'tv-test' }));
    await open();
    assert.equal(await page.locator('#tvWatchedSeason').inputValue(), '');
    assert.equal(await page.locator('#tvWatchedEpisode').inputValue(), '');
    await save();
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].lastWatched), 'Legacy personal progress');
    await open(); await setWatched(1, 2); await save();
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
    await page.waitForFunction(() => !document.querySelector('#tvRefresh').disabled);
    assert.match(await page.locator('#tvBatchStatus').innerText(), /1 of 1 shows refreshed/);
    const recovery = await page.evaluate(() => {
      const a = window.LocalApp;
      return { reason: a.storage.recoveryInfo().reason, localRecovery: localStorage.getItem(a.config.storage.recoveryKey), movies: a.storage.getState().workspace.movies.length, watched: a.storage.getState().workspace.tvShows[0].lastWatched };
    });
    assert.equal(recovery.reason, 'Before refreshing all TV shows'); assert.equal(recovery.localRecovery, null);
    assert.equal(recovery.movies, 400); assert.equal(recovery.watched, 'S1 E2');
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.movies.length), 400);
    const rowRequested = new Promise(resolve => { seasonRequested = resolve; }); holdSeason = true;
    await row.locator('[data-tv-refresh-id]').click(); await rowRequested;
    assert.equal(await row.locator('[data-tv-refresh-id]').isDisabled(), true);
    await page.evaluate(() => window.LocalApp.storage.mutate(state => { state.workspace.tvShows[0].notes = 'Edited during single-show refresh'; }, { reason: 'tv-test' }));
    holdSeason = false; releaseSeason();
    await page.waitForFunction(() => document.querySelector('#tvBatchStatus').textContent.includes('0 of 1 shows refreshed; 1 skipped'));
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].notes), 'Edited during single-show refresh');
    // A failed per-show write must not publish an unsaved refresh or increment the success count.
    await page.evaluate(() => {
      const a = window.LocalApp;
      window.tvBeforeFailedWrite = a.utils.stableJson(a.storage.getState().workspace.tvShows);
      window.tvReplace = a.storage.replace;
      a.storage.replace = () => { throw new Error('Synthetic storage full'); };
    });
    await row.locator('[data-tv-refresh-id]').click();
    await page.waitForFunction(() => document.querySelector('#tvBatchStatus').textContent.includes('Synthetic storage full'));
    assert.match(await page.locator('#tvBatchStatus').innerText(), /0 of 1 shows refreshed/);
    assert.equal(await page.evaluate(() => {
      const a = window.LocalApp; a.storage.replace = window.tvReplace;
      return a.utils.stableJson(a.storage.getState().workspace.tvShows) === window.tvBeforeFailedWrite;
    }), true);
    const confirmDelete = async () => {
      await page.locator('#tvDelete').click();
      await page.waitForSelector('#confirmDialog[open]');
      await page.locator('#confirmDialog [data-confirm-action]').click();
    };
    // Failed deletion persistence keeps the show and editor; recovery uses IndexedDB.
    await open();
    await page.evaluate(() => {
      const a = window.LocalApp; window.deleteReplace = a.storage.replace;
      a.storage.replace = () => { throw new Error('Synthetic delete write failure'); };
    });
    await confirmDelete();
    await page.waitForFunction(() => document.querySelector('#tvEditorStatus').textContent.includes('Synthetic delete write failure'));
    assert.equal(await page.locator('#tvDialog').evaluate(el => el.open), true);
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].deleted), undefined);
    await page.evaluate(() => { window.LocalApp.storage.replace = window.deleteReplace; });
    // A change while the async recovery is pending rejects the destructive operation.
    await page.evaluate(() => {
      const a = window.LocalApp; window.deleteRecovery = a.storage.saveRecoveryAsync;
      a.storage.saveRecoveryAsync = () => new Promise(resolve => { window.finishDeleteRecovery = () => resolve(true); });
    });
    await confirmDelete();
    await page.waitForFunction(() => typeof window.finishDeleteRecovery === 'function');
    await page.evaluate(() => {
      const a = window.LocalApp;
      a.storage.mutate(state => { state.workspace.tvShows[0].notes = 'Concurrent edit during delete recovery'; }, { reason: 'tv-test' });
      window.finishDeleteRecovery(); a.storage.saveRecoveryAsync = window.deleteRecovery;
    });
    await page.waitForFunction(() => document.querySelector('#tvEditorStatus').textContent.includes('changed while preparing recovery'));
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].deleted), undefined);
    await page.locator('#tvCancel').click();
    await open(); await confirmDelete();
    await page.waitForSelector('#tvDialog:not([open])', { state: 'attached' });
    const deleted = await page.evaluate(() => {
      const a = window.LocalApp;
      return { show: a.storage.getState().workspace.tvShows[0], reason: a.storage.recoveryInfo().reason, rawRecovery: localStorage.getItem(a.config.storage.recoveryKey), movies: a.storage.getState().workspace.movies.length };
    });
    assert.equal(deleted.show.deleted, true); assert.equal(deleted.reason, 'Before deleting TV show');
    assert.equal(deleted.rawRecovery, null); assert.equal(deleted.movies, 400);
    await page.reload(); await page.waitForSelector('html.app-ready');
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].deleted), true);
    await page.evaluate(async () => { await window.LocalApp.storage.restoreRecovery(); });
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().workspace.tvShows[0].notes), 'Concurrent edit during delete recovery');
    // Long lists and pivots retain the toolbar below the app header on desktop and mobile.
    await page.evaluate(() => {
      const a = window.LocalApp;
      a.storage.mutate(state => { state.workspace.tvShows.push(...Array.from({ length: 80 }, (_, i) => a.tv.normalize({ id: 'scroll-' + i, title: 'Scroll fixture ' + i, genres: ['Genre ' + i], networks: ['Network ' + i], type: 'Type ' + i }))); }, { reason: 'tv-test' });
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('[data-tv-view="list"]').click();
      await page.evaluate(() => { const table = document.querySelector('#tvListView > .tv-table-scroll'); table.scrollTop = 500; window.scrollTo(0, document.documentElement.scrollHeight); });
      await page.waitForTimeout(200);
      const layout = await page.evaluate(() => {
        const toolbar = document.querySelector('.tv-sticky-controls'), header = document.querySelector('.app-header').getBoundingClientRect();
        const table = document.querySelector('#tvListView > .tv-table-scroll').getBoundingClientRect(), th = document.querySelector('#tvTable th').getBoundingClientRect();
        return { position: getComputedStyle(toolbar).position, top: toolbar.getBoundingClientRect().top, headerBottom: header.bottom, headerGap: Math.abs(th.top - table.top), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(layout.position, 'sticky'); assert.ok(layout.top >= layout.headerBottom - 1); assert.ok(layout.headerGap <= 2); assert.equal(layout.overflow, false);
      assert.equal(await page.locator('#tvSearch').isVisible(), true);
      await page.locator('[data-tv-view="pivots"]').click();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(150);
      assert.equal(await page.locator('#tvFiltersDisclosure').isHidden(), true);
      assert.ok(await page.locator('.tv-sticky-controls').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('.app-header').getBoundingClientRect().bottom - 1));
      assert.equal(await page.locator('#tvSearch').isVisible(), true);
      if (width === 390) await page.screenshot({ path: '/tmp/top-shelf-tv-sticky.png' });
    }
    assert.deepEqual(errors, []);
    console.log('TV progress browser checks passed: refresh, highlights, status filters, episode selection, stale draft, offline reload and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
