// Fresh profile and synthetic shelves; no provider requests or personal content.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 404, json: {} }));
    await page.goto(process.env.MEDIA_TEST_URL || 'http://localhost:8000');
    await page.waitForSelector('html.app-ready');
    await page.evaluate(() => {
      const a = window.LocalApp, state = a.utils.clone(a.storage.getState());
      state.workspace.movies = [
        a.movies.normalize({ id: 'one', tmdbId: 1, title: 'First Movie', status: 'watched', rating: 4, genres: ['Drama'], how: 'Netflix', other: 'Favorite, Subgenre: Mystery', actors: ['A very long synthetic actor name', 'Another very long synthetic actor name'], directors: ['A very long synthetic director name', 'Another very long synthetic director name'] }),
        a.movies.normalize({ id: 'two', tmdbId: 2, title: 'Second Movie', status: 'wishlist', genres: ['Comedy'], how: 'Netflix', other: 'Favorite' }),
        a.movies.normalize({ id: 'three', tmdbId: 3, title: 'Third Movie', status: 'wishlist', genres: ['Drama'], how: 'Disc', other: '<Special>' })
      ];
      state.workspace.tvShows = [a.tv.normalize({ id: 'show', title: 'Synthetic Show', status: 'Watching', type: 'Scripted', genres: ['Drama'], networks: ['Example'] })];
      a.storage.replace(state, { saveRecovery: false, reason: 'import' }); a.application.switchModule('movies');
    });
    for (const width of [1440, 1000, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('[data-shelf="movies"]').click();
      assert.equal(await page.locator('#movieResultsCount').innerText(), '3 / 3');
      await page.locator('#movieFiltersButton').click();
      assert.equal(await page.locator('#movieFiltersButton').getAttribute('aria-expanded'), 'true');
      await page.locator('#moviePivotFilter + .counted-select .counted-select-trigger').click();
      const favorite = page.locator('#moviePivotFilterMenu [role="option"]').filter({ hasText: 'Favorite' });
      assert.equal(await favorite.locator('.filter-option-count').innerText(), '2');
      if (process.env.MEDIA_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}/movie-menu-${width}.png` });
      const parts = await favorite.locator('span').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
      assert.ok(parts[1] > parts[0]);
      await favorite.click();
      assert.equal(await page.locator('#movieResultsCount').innerText(), '2 / 3');
      await page.selectOption('#movieGenreFilter', 'Drama');
      await page.selectOption('#movieHowFilter', 'value:netflix');
      assert.equal(await page.locator('#movieResultsCount').innerText(), '1 / 3');
      await page.fill('#movieSearch', 'Second');
      assert.equal(await page.locator('#movieResultsCount').innerText(), '0 / 3');
      await page.fill('#movieSearch', '');
      await page.selectOption('#moviePivotFilter', '');
      await page.selectOption('#movieGenreFilter', '');
      await page.selectOption('#movieHowFilter', '');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#movieFiltersDisclosure').isVisible(), false);
      await page.locator('[data-movie-view="pivots"]').click();
      assert.equal(await page.locator('#movieFiltersButton').isVisible(), false);
      await page.locator('[data-movie-view="list"]').click();
      for (const shelf of ['movies', 'tv']) {
        await page.locator(`[data-shelf="${shelf}"]`).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${shelf} overflow at ${width}`);
        const prefix = shelf === 'movies' ? 'movie' : 'tv';
        const filters = page.locator(`#${prefix}FiltersButton`);
        const add = page.locator(shelf === 'movies' ? '#movieToolbar [data-add-movie]' : '#tvAdd');
        const f = await filters.boundingBox(), b = await add.boundingBox();
        assert.ok(f && b && f.x < b.x && Math.abs(f.y - b.y) < 2, `Filters before Add: ${shelf} ${width}`);
        if (width <= 1350) {
          const more = await page.locator(shelf === 'movies' ? '.movie-add .compact-actions' : '.tv-toolbar-actions .compact-actions').boundingBox();
          assert.ok(more && more.x < f.x, `More before Filters: ${shelf} ${width}`);
        }
        assert.equal(await filters.locator('.button-label').isVisible(), true);
        const search = await page.locator(shelf === 'movies' ? '#movieToolbar .movie-search' : '.tv-search').boundingBox();
        assert.equal(Math.round(search.height), Math.round(b.height), `Search matches actions: ${shelf} ${width}`);
        if (shelf === 'movies' && width <= 1350) {
          const longCell = page.locator('.movie-col-actors .movie-cell').first();
          assert.equal(await longCell.evaluate(node => getComputedStyle(node).whiteSpace), 'nowrap');
          assert.ok(await longCell.evaluate(node => node.scrollWidth > node.clientWidth));
        }
        if (process.env.MEDIA_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}/${shelf}-${width}.png` });
        await filters.click();
        assert.equal(await page.locator(`#${prefix}FiltersDisclosure`).isVisible(), true);
        await filters.click();
      }
      if (process.env.MEDIA_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.MEDIA_SCREENSHOT_DIR}/tv-${width}.png` });
      assert.equal(await page.locator('#tvImportButton').count(), 0);
      assert.equal(await page.locator('#tvCount').innerText(), '1 / 1');
      await page.locator('#tvFilter + .counted-select .counted-select-trigger').click();
      assert.equal(await page.locator('#tvFilterMenu [role="option"]').filter({ hasText: 'Watching' }).locator('.filter-option-count').innerText(), '1');
      await page.keyboard.press('Escape');
      await page.locator('#tvTitle').focus();
      await page.keyboard.press('p');
      assert.equal(await page.locator('#tvPivotsView').isVisible(), true);
      await page.keyboard.press('l');
      assert.equal(await page.locator('#tvListView').isVisible(), true);
      await page.locator('#tvFiltersButton').click();
      await page.selectOption('#tvGenresFilter', 'Drama');
      assert.equal(await page.locator('#tvCount').innerText(), '1 / 1');
      await page.locator('#tvFiltersButton').click();
    }
    assert.deepEqual(errors, []);
    console.log('Media toolbars passed: category intersections, counts, disclosures, actions, pivots and desktop/1000/390/320px layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
