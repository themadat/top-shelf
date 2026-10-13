// Fresh profile, synthetic movies and mocked TMDB/GitHub; no live credentials.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://api.github.com/**', route => route.fulfill({ status: 404, json: {} }));
    await page.route('https://api.themoviedb.org/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/watch/providers')) return route.fulfill({ json: { results: {} } });
      if (url.pathname.endsWith('/release_dates')) return route.fulfill({ json: { results: [] } });
      const id = Number(url.pathname.split('/').pop());
      return route.fulfill({ json: { id, title: 'Linked Movie ' + id, release_date: '2026-01-01', genres: id === 102 ? [] : [{ name: 'Adventure' }, { name: 'Science Fiction' }], production_companies: [{ name: 'Synthetic Studio' }], credits: { cast: [{ name: 'Synthetic Actor', order: 0 }], crew: [{ name: 'Synthetic Director', job: 'Director' }] } } });
    });
    const ready = () => page.waitForSelector('html.app-ready');
    const open = async id => {
      if (id) await page.locator('[data-edit-movie="' + id + '"]').click();
      else await page.getByRole('button', { name: 'Add Movie', exact: true }).click();
      await page.waitForSelector('#movieDialog[open]');
    };
    const close = () => page.locator('#movieDialog [data-close-dialog="movieDialog"]').click();
    const picker = page.locator('#movieSubgenrePicker');
    const getMovie = id => page.evaluate(id => window.LocalApp.storage.getState().workspace.movies.find(m => m.id === id), id);
    await page.goto(process.env.MOVIES_TEST_URL || 'http://localhost:8000'); await ready();
    await page.evaluate(() => {
      const a = window.LocalApp, state = a.utils.clone(a.storage.getState());
      state.workspace.movies = [
        a.movies.normalize({ id: 'one', tmdbId: 1, title: 'First Movie', status: 'watched', rating: 4, genres: ['Drama', 'Mystery'], how: 'Disc', other: 'Favorite\nSubgenre time   TRAVEL', subgenreReviewed: true }),
        a.movies.normalize({ id: 'two', tmdbId: 2, title: 'Second Movie', status: 'wishlist', how: 'Disc', other: 'Keep this, Subgenre neo-noir' })
      ];
      a.storage.replace(state, { saveRecovery: false });
      a.application.switchModule('movies');
    });
    await open('one');
    assert.equal(await page.locator('#movieGenres').innerText(), 'Drama, Mystery');
    assert.equal(await page.locator('#movieGenreSummary').isVisible(), true);
    assert.equal(await page.locator('#movieDetails').getAttribute('open'), null);
    assert.equal(await page.locator('#movieForm [name="other"]').inputValue(), 'Favorite');
    assert.equal(await picker.getByRole('checkbox', { name: 'Time Travel', exact: true }).isChecked(), true);
    await picker.getByRole('checkbox', { name: 'Time Travel', exact: true }).uncheck();
    assert.equal(await picker.locator('input[type="text"], button').count(), 0);
    assert.equal(await page.locator('.movie-lookup-row [name="incompleteOverride"]').count(), 1);
    assert.equal(await page.locator('.movie-lookup-row [aria-label="Movie State"]').count(), 1);
    assert.equal(await page.locator('#movieGenreSummary [name="subgenreReviewed"]').count(), 1);
    assert.equal(await page.evaluate(() => document.querySelector('#movieGenreSummary').nextElementSibling?.id === 'movieSubgenrePicker'), true);
    await page.screenshot({ path: '/tmp/top-shelf-movie-editor-desktop.png' });
    await picker.getByRole('checkbox', { name: 'Neo-Noir', exact: true }).check();
    await picker.getByRole('checkbox', { name: 'Holmesian', exact: true }).check();
    await page.locator('#movieSaveButton').click();
    let movie = await getMovie('one');
    assert.equal(movie.other, 'Favorite\nSubgenre: Holmesian, Subgenre: Neo-Noir');
    assert.equal(movie.subgenreReviewed, true); assert.equal(movie.rating, 4);
    await page.reload(); await ready(); await open('one');
    assert.equal(await picker.getByRole('checkbox', { name: 'Holmesian', exact: true }).isChecked(), true);
    assert.equal(await picker.getByRole('checkbox', { name: 'Time Travel', exact: true }).count(), 0);
    await close();

    // The same picker feeds the existing bulk preview/recovery flow.
    await page.locator('#bulkPivotsButton').click();
    const bulk = page.locator('#bulkSubgenrePicker');
    await bulk.getByRole('checkbox', { name: 'Holmesian', exact: true }).check();
    await page.locator('#bulkPivotMovies').fill('2');
    await page.locator('#bulkPivotReview').click();
    assert.equal(await page.locator('#bulkPivotApply').isEnabled(), true);
    assert.equal(await bulk.locator('input[type="text"], button').count(), 0);
    await bulk.getByRole('checkbox', { name: 'Holmesian', exact: true }).uncheck();
    assert.equal(await page.locator('#bulkPivotApply').isEnabled(), false);
    await bulk.getByRole('checkbox', { name: 'Holmesian', exact: true }).check();
    await page.locator('#bulkPivotReview').click(); await page.locator('#bulkPivotApply').click();
    assert.equal((await getMovie('two')).other, 'Keep this, Subgenre: Neo-Noir\nSubgenre: Holmesian');
    assert.ok(await page.evaluate(() => window.LocalApp.storage.recoveryInfo()));

    // Linking populates provider genres outside Details and preserves personal selections.
    await page.evaluate(() => window.LocalApp.tmdb.saveToken('synthetic-tmdb-token', false));
    await open();
    assert.equal(await page.locator('#movieGenres').innerText(), 'Link a movie to see genres');
    await picker.getByRole('checkbox', { name: 'Holmesian', exact: true }).check();
    await page.locator('#movieForm [name="other"]').fill('Added personal pivot');
    await page.locator('#movieForm [name="notes"]').fill('Saved addition note');
    await page.locator('#movieLookupQuery').fill('101'); await page.locator('#movieLookupButton').click();
    await page.waitForFunction(() => document.querySelector('#movieGenres').textContent === 'Adventure, Science Fiction');
    assert.equal(await page.locator('#movieGenreSummary').isVisible(), true);
    assert.equal(await page.locator('#movieDetails').getAttribute('open'), null);
    assert.equal(await picker.getByRole('checkbox', { name: 'Holmesian', exact: true }).isChecked(), true);
    await page.locator('#movieLookupQuery').fill('102'); await page.locator('#movieLookupButton').click();
    await page.waitForFunction(() => document.querySelector('#movieGenres').textContent === 'No genres listed');
    assert.equal(await page.locator('#movieDetails').getAttribute('open'), null);
    await page.locator('#movieSaveButton').click();
    await page.getByRole('button', { name: 'Linked Movie 102', exact: true }).click();
    await page.waitForSelector('#movieDialog[open]');
    assert.equal(await page.locator('#movieForm [name="notes"]').inputValue(), 'Saved addition note');
    assert.equal(await picker.getByRole('checkbox', { name: 'Holmesian', exact: true }).isChecked(), true);
    await page.locator('#movieTitle').fill('Edited Added Movie');
    await page.locator('#movieSaveButton').click();
    await page.reload(); await ready();
    await page.getByRole('button', { name: 'Edited Added Movie', exact: true }).click();
    await page.waitForSelector('#movieDialog[open]');
    assert.equal(await page.locator('#movieTitle').inputValue(), 'Edited Added Movie');
    assert.equal(await page.locator('#movieForm [name="other"]').inputValue(), 'Added personal pivot');
    assert.equal(await page.locator('#movieForm [name="notes"]').inputValue(), 'Saved addition note');
    assert.equal(await picker.getByRole('checkbox', { name: 'Holmesian', exact: true }).isChecked(), true);
    await close();

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await open('one');
      assert.equal(await picker.locator('input[type="text"], button').count(), 0);
      assert.equal(await page.evaluate(() => document.querySelector('#movieDialog').scrollWidth > innerWidth), false);
      await page.screenshot({ path: '/tmp/top-shelf-movie-editor-' + width + '.png' });
      await close();
    }
    assert.deepEqual(errors, []);
    console.log('Movie browser checks passed: actual list-title clicks; add/link/save/reopen/edit/reload/reopen; normalized subgenres; review/personal fields; bulk recovery/preview; genres with closed Details; selection-only controls; requested row layout; 390/320px layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
