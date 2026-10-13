// Fresh browser, synthetic content and mocked GitHub. Never contacts a live data repository.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors = [], uploads = [];
    let remote = { syncFormat: 'top-shelf-app-data', syncVersion: 11, schemaVersion: 15, data: {} }, revision = 0, offline = false;
    const sha = () => 'synthetic-revision-' + revision;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('https://api.github.com/**', async route => {
      if (offline) return route.abort('internetdisconnected');
      const request = route.request();
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        if (body.sha !== sha()) return route.fulfill({ status: 409, json: { message: 'Revision changed' } });
        remote = JSON.parse(Buffer.from(body.content, 'base64').toString());
        uploads.push(remote); revision += 1;
        return route.fulfill({ json: { content: { sha: sha() } } });
      }
      return route.fulfill({ json: { type: 'file', sha: sha(), encoding: 'base64', content: Buffer.from(JSON.stringify(remote)).toString('base64') } });
    });
    const ready = () => page.waitForSelector('html.app-ready');
    const notes = () => page.evaluate(() => window.LocalApp.storage.getState().workspace.documents[0]?.html || '');
    const waitForNotes = text => page.waitForFunction(text => window.LocalApp.storage.getState().workspace.documents[0]?.html.includes(text), text);
    const synced = () => page.waitForFunction(() => window.LocalApp.sync.getInfo().state === 'upToDate');
    const setRemoteNotes = async text => {
      remote = await page.evaluate(text => {
        const a = window.LocalApp, state = a.stateModel.createDefaultState();
        state.workspace.documents = [{ id: 'app-notes', title: 'Notes', html: '<p>' + text + '</p>', createdAt: state.meta.createdAt, updatedAt: state.meta.updatedAt }];
        return a.stateModel.syncPayload(state);
      }, text);
      revision += 1;
    };
    const typeNotes = async text => {
      await page.locator('#notesButton').click();
      await page.locator('#notesTextarea').fill(text);
    };
    const closeNotes = () => page.locator('#notesDialog [data-close-dialog="notesDialog"]').click();

    await page.goto(process.env.SYNC_TEST_URL || 'http://localhost:8000'); await ready();
    await page.evaluate(async () => {
      const a = window.LocalApp;
      a.storage.setSecret('synthetic-test-token', false);
      await a.sync.check(true);
      a.storage.mutate(s => { s.preferences.appearance.mode = 'dark'; });
      a.storage.saveNow();
    });
    await setRemoteNotes('Latest on initial load');
    await page.reload(); await ready(); await waitForNotes('Latest on initial load'); await synced();
    assert.equal(await page.evaluate(() => window.LocalApp.storage.getState().preferences.appearance.mode), 'dark');
    assert.equal(uploads.length, 0);
    assert.ok(await page.evaluate(() => window.LocalApp.storage.recoveryInfo()));

    await typeNotes('Automatically uploaded café 🎬');
    await page.waitForFunction(() => window.LocalApp.sync.getInfo().state === 'pending');
    await synced();
    assert.equal(uploads.length, 1);
    assert.match(JSON.stringify(remote), /Automatically uploaded café 🎬/);
    assert.doesNotMatch(JSON.stringify(remote), /synthetic-test-token|appearance/);
    await closeNotes(); await page.reload(); await ready(); await synced();
    assert.match(await notes(), /Automatically uploaded café 🎬/);

    // A remote-only change cannot redraw an open editor, even if it has focus.
    await page.locator('#notesButton').click();
    await setRemoteNotes('Downloaded after editor closes');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => window.LocalApp.sync.getInfo().change === 'remote' && !window.LocalApp.sync.getInfo().busy);
    assert.match(await page.locator('#notesTextarea').innerText(), /Automatically uploaded café 🎬/);
    await closeNotes(); await waitForNotes('Downloaded after editor closes'); await synced();
    assert.equal(uploads.length, 1);

    // Real browser offline events, local autosave, service-worker reload and reconnect.
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    offline = true; await context.setOffline(true);
    await typeNotes('Saved while offline'); await closeNotes();
    await page.waitForFunction(() => {
      const a = window.LocalApp;
      return a.storageCodec.parse(localStorage.getItem(a.config.storage.stateKey)).workspace.documents[0]?.html.includes('Saved while offline');
    });
    await page.reload(); await ready(); assert.match(await notes(), /Saved while offline/);
    assert.equal(uploads.length, 1);
    offline = false; await context.setOffline(false);
    // Chromium's emulation can reset navigator.onLine on a service-worker reload.
    // Deliver reconnect explicitly so this case also exercises the app's handler.
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await synced();
    assert.equal(uploads.length, 2); assert.match(JSON.stringify(remote), /Saved while offline/);

    // Preference saves do not schedule another GitHub write.
    await page.locator('#appIconButton').click();
    await page.waitForTimeout(1800);
    assert.equal(uploads.length, 2);

    offline = true; await context.setOffline(true);
    await typeNotes('Local conflict stays safe'); await closeNotes();
    await setRemoteNotes('Concurrent cloud conflict');
    offline = false; await context.setOffline(false);
    await page.waitForFunction(() => window.LocalApp.sync.getInfo().change === 'conflict' && !window.LocalApp.sync.getInfo().busy);
    assert.match(await notes(), /Local conflict stays safe/);
    assert.match(JSON.stringify(remote), /Concurrent cloud conflict/);
    assert.equal(uploads.length, 2);
    assert.equal(await page.locator('#choiceDialog').isVisible(), false, 'background sync does not interrupt with a conflict dialog');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.LocalApp.application.openSupport('dataSync'));
    assert.equal(await page.locator('#supportDialog').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('Browser auto-sync passed: initial load/reload, quiet Notes upload, editor deferral, recovery, offline edit/reload/reconnect, local preferences, conflicts, and 390px Settings.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
