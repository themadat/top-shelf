(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, tv = App.tv, esc = u.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  const columns = [['rating', '#', 105], ['voteAverage', 'Ave', 75], ['title', 'Show', 250], ['networks', 'Networks', 120], ['status', 'My Status', 100], ['providerStatus', 'Status', 110], ['numberOfSeasons', 'S', 40], ['numberOfEpisodes', 'E', 40], ['progress', 'Progress', 295], ['latestEpisode', 'Latest', 105], ['lastAirDate', 'Last Air', 110], ['type', 'Type', 100], ['genres', 'Genres', 180], ['notes', 'Notes', 140]];
  let batch = null, resizing = false, pivot = null;
  const networkColors = {
    'netflix': ['#e50914', '#fff'], 'hbo': ['#171717', '#fff'], 'hbo max': ['#5822b4', '#fff'], 'max': ['#002be7', '#fff'],
    'bbc': ['#111', '#fff'], 'bbc one': ['#b90016', '#fff'], 'bbc two': ['#007f80', '#fff'], 'bbc three': ['#ed008c', '#fff'],
    'abc': ['#171717', '#fff'], 'cbs': ['#003b70', '#fff'], 'nbc': ['#653c91', '#fff'], 'fox': ['#003b71', '#fff'],
    'fx': ['#171717', '#fff'], 'fxx': ['#171717', '#fff'], 'amc': ['#ead36b', '#25220f'], 'showtime': ['#b60019', '#fff'],
    'starz': ['#171717', '#fff'], 'hulu': ['#1ce783', '#073b25'], 'prime video': ['#00a8e1', '#082f49'], 'amazon': ['#ff9900', '#171717'],
    'amazon prime video': ['#00a8e1', '#082f49'], 'apple tv+': ['#171717', '#fff'], 'apple tv': ['#171717', '#fff'],
    'disney+': ['#006e78', '#fff'], 'disney channel': ['#1769c2', '#fff'], 'paramount+': ['#0064ff', '#fff'],
    'peacock': ['#171717', '#fff'], 'the cw': ['#c43e00', '#fff'], 'channel 4': ['#14786c', '#fff'], 'itv': ['#cbea3b', '#253300'],
    'adult swim': ['#171717', '#fff'], 'cartoon network': ['#171717', '#fff'], 'comedy central': ['#ffeb00', '#171717'],
    'syfy': ['#cfef00', '#252b00'], 'usa network': ['#124bb2', '#fff'], 'tnt': ['#c51526', '#fff'], 'tbs': ['#0058a8', '#fff'],
    'pbs': ['#2638c4', '#fff'], 'discovery': ['#1465a0', '#fff'], 'national geographic': ['#ffcc00', '#171717']
  };
  function networkPill(name) {
    const palette = networkColors[name.trim().toLowerCase()];
    return '<span class="tv-network-pill"' + (palette ? ' style="background:' + palette[0] + ';color:' + palette[1] + '"' : '') + '>' + esc(name) + '</span>';
  }
  function tone(value) { return ({ 'Want to Watch': 'gold', Watching: 'blue', 'Airing': 'green', 'Caught Up': 'green', Completed: 'purple', Stopped: 'red', Active: 'green', Ended: 'purple', Canceled: 'red', Upcoming: 'blue' })[value] || 'muted'; }
  function balanceFilters() {
    const grid = $('#tvPivots'), sections = Array.from(grid.children), available = grid.clientWidth - 32;
    if (!grid.clientWidth || grid.clientWidth < 680) { grid.style.gridTemplateColumns = ''; return; }
    const widths = sections.map(function (section) { return Array.from(section.querySelectorAll('button')).map(function (button) { return button.offsetWidth; }); });
    const rowsAt = function (items, width) { let rows = 1, used = 0; items.forEach(function (w) { if (used && used + 6 + w > width) { rows++; used = w; } else used += (used ? 6 : 0) + w; }); return rows; };
    let sizes;
    for (let rows = 1; rows <= Math.max(1, ...widths.map(function (items) { return items.length; })); rows++) {
      sizes = widths.map(function (items) {
        let low = Math.max(110, ...items), high = Math.max(low, items.reduce(function (a, b) { return a + b + 6; }, 0));
        while (high - low > 1) { const mid = Math.floor((low + high) / 2); if (rowsAt(items, mid) <= rows) high = mid; else low = mid + 1; }
        return high;
      });
      if (sizes.reduce(function (a, b) { return a + b; }, 0) <= available) break;
    }
    const extra = Math.max(0, available - sizes.reduce(function (a, b) { return a + b; }, 0)) / 3;
    grid.style.gridTemplateColumns = sizes.map(function (size) { return (size + extra) + 'px'; }).join(' ');
  }
  function renderPivots(shows) {
    $('#tvPivots').innerHTML = ['type', 'genres', 'networks'].map(function (key) {
      const groups = new Map();
      shows.forEach(function (s) { const values = key === 'type' ? [s.type] : s[key]; new Set(values.filter(Boolean)).forEach(function (v) { groups.set(v, (groups.get(v) || 0) + 1); }); });
      return '<section><h3>' + ({ type: 'Type', genres: 'Genres', networks: 'Networks' })[key] + '</h3><div class="tv-filter-pills">' + Array.from(groups).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).map(function (entry) { return '<button type="button" class="button small" data-tv-pivot="' + key + '" data-value="' + esc(entry[0]) + '" aria-pressed="' + !!(pivot && pivot.key === key && pivot.value === entry[0]) + '">' + esc(entry[0]) + ' <small>' + entry[1] + '</small></button>'; }).join('') + '</div></section>';
    }).join('');
    requestAnimationFrame(balanceFilters);
  }
  function state() { return App.storage.getState(); }
  function saved() { return state().workspace.tvShows.filter(function (s) { return !s.deleted; }); }
  function pref() { return state().ui.tv; }
  function preference(patch) { App.storage.mutate(function (s) { Object.assign(s.ui.tv, patch); }, { touch: false, reason: 'tv-preference' }); }
  function options(items, value) { return items.map(function (s) { return '<option' + (s === value ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join(''); }
  function value(show, key) {
    if (key === 'genres' || key === 'networks') return show[key].join(', ');
    if (key === 'inProduction') return show[key] === null ? null : show[key] ? 'Yes' : 'No';
    if (key === 'providerStatus') return tv.seriesStatus(show);
    if (key === 'latestEpisode') return tv.progress(show).releasedLabel;
    if (key === 'progress') return tv.progress(show).label;
    return show[key];
  }
  function isCountColumn(key) { return key === 'numberOfSeasons' || key === 'numberOfEpisodes'; }
  function contentWidth(key) {
    const ctx = document.createElement('canvas').getContext('2d'), table = $('#tvTable');
    ctx.font = getComputedStyle(table).font;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (key === 'title') return Math.ceil(Math.max(80, ...saved().map(function (s) { return ctx.measureText(s.title).width + (s.tmdbId ? 4.2 * rem : 0) + 18; })));
    return Math.ceil(Math.max(100, ...saved().map(function (s) {
      const p = tv.progress(s), badge = p.caughtUp ? rem : ctx.measureText(p.available ? '-' + p.available : '—').width;
      return ctx.measureText(p.label || '—').width + badge + 4.8 * rem + 18;
    })));
  }
  function columnWidth(c) {
    const width = pref().widths[c[0]];
    if (c[0] === 'title') return Math.max(width || 0, contentWidth('title'));
    if (c[0] === 'progress') return contentWidth('progress');
    if ((c[0] === 'networks' && width === 160) || (c[0] === 'status' && width === 140)) return c[2];
    if (!isCountColumn(c[0])) return width || c[2];
    const ctx = document.createElement('canvas').getContext('2d'); ctx.font = getComputedStyle($('#tvTable')).font;
    const fitted = Math.ceil(Math.max(40, ...saved().map(function (s) { return ctx.measureText(String(s[c[0]] ?? '—')).width + 24; })));
    return width && width !== 65 ? Math.max(width, fitted) : fitted;
  }
  function progressCell(show, p) {
    const badge = p.caughtUp ? '<span class="tv-caught-up" role="img" aria-label="Caught up" title="Caught up">' + App.icons.markup('check') + '</span>'
      : p.available ? '<span class="tv-behind" title="' + (p.complete ? '' : 'At least ') + p.available + ' aired episodes behind">-' + p.available + '</span>' : '<span class="tv-progress-unknown" title="Refresh episode details to check progress">—</span>';
    return '<div class="tv-progress-cell"><button type="button" class="tv-title-button tv-watched-episode" data-tv-open="' + show.id + '" aria-label="Edit latest watched episode for ' + esc(show.title) + '">' + esc(p.label || '—') + '</button>' + badge
      + '<span class="tv-progress-actions"><button type="button" data-tv-advance="one"' + ' aria-label="Watch next episode of ' + esc(show.title) + '" title="Mark one more episode watched">' + App.icons.markup('tvAdvance') + '</button>'
      + '<button type="button" data-tv-advance="all"' + ' aria-label="Mark all caught up on ' + esc(show.title) + '" title="Mark all aired episodes watched">' + App.icons.markup('tvCatchUp') + '</button></span></div>';
  }
  function setBatchStatus(message) {
    $('#tvBatchStatus').textContent = message;
    $('#tvStatusDismiss').hidden = !message;
    $('.tv-batch').hidden = !message && !batch;
  }
  function advance(id, all, trigger) {
    if (App.tvEditor.isEditing(id)) { setBatchStatus('Save or close this show’s editor before changing its progress.'); return; }
    const snapshot = saved().find(function (s) { return s.id === id; }); if (!snapshot) return;
    const next = tv.advance(snapshot, all);
    if (next === snapshot) { setBatchStatus(all && !tv.progress(snapshot).released ? 'Latest episode is unknown. Refresh Show Data or load episode details, then try again.' : 'Already at the latest episode.'); return; }
    const state = u.clone(App.storage.getState()), index = state.workspace.tvShows.findIndex(function (s) { return s.id === id; });
    if (index < 0 || u.stableJson(state.workspace.tvShows[index]) !== u.stableJson(snapshot)) { setBatchStatus('This show changed. Try updating progress again.'); return; }
    state.workspace.tvShows[index] = next;
    try { App.storage.replace(state, { saveRecovery: false, reason: 'tv-progress' }); }
    catch (error) { setBatchStatus(error.message); return; }
    const row = $('#tvTable').querySelector('[data-tv-id="' + id + '"]');
    const control = row?.querySelector('[data-tv-advance="' + trigger + '"]:not(:disabled)') || row?.querySelector('.tv-watched-episode');
    (control || $('#tvFilter')).focus();
  }
  function render() {
    const shows = saved(), p = pref(), needle = p.query.toLowerCase();
    const filtersView = p.view === 'pivots';
    $('#tvListView').hidden = filtersView; $('#tvPivotsView').hidden = !filtersView; $('#tvFiltersButton').hidden = filtersView; if (filtersView) { $('#tvFiltersDisclosure').hidden = true; $('#tvFiltersButton').setAttribute('aria-expanded', 'false'); }
    document.querySelectorAll('[data-tv-view]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.tvView === (filtersView ? 'pivots' : 'list'))); });
    $('#tvSearch').value = p.query; $('#tvFilter').value = p.filter;
    const rows = shows.filter(function (s) { return (p.filter === 'all' || tv.viewingStatus(s) === p.filter) && (!needle || tv.searchable(s).includes(needle)) && (!pivot || (pivot.key === 'type' ? s.type === pivot.value : s[pivot.key].includes(pivot.value))); });
    rows.sort(function (a, b) { return tv.compare(a, b, p.sort, p.direction); });
    renderPivots(shows);
    App.tvPivotsUI.render(shows);
    const widths = columns.map(columnWidth);
    $('#tvTable').style.width = widths.reduce(function (a, b) { return a + b; }, 0) + 'px';
    $('#tvTable colgroup').innerHTML = columns.map(function (c, i) { return '<col data-tv-col="' + c[0] + '" style="width:' + widths[i] + 'px">'; }).join('');
    $('#tvTable thead').innerHTML = '<tr>' + columns.map(function (c) {
      return '<th scope="col" aria-sort="' + (p.sort === c[0] ? (p.direction === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-tv-sort="' + c[0] + '">' + c[1] + (p.sort === c[0] ? (p.direction === 'asc' ? ' ↑' : ' ↓') : '') + '</button>' + (c[0] === 'progress' ? '' : '<button type="button" class="tv-resize" data-tv-resize="' + c[0] + '" aria-label="Resize ' + c[1] + ' column" title="Drag to resize. Double-click to fit. Arrow keys resize; Enter fits."></button>') + '</th>';
    }).join('') + '</tr>';
    $('#tvTable tbody').innerHTML = rows.map(function (s) {
      const progress = tv.progress(s), viewingStatus = tv.viewingStatus(s);
      const wishlist = s.status === 'Want to Watch', field = wishlist ? 'priority' : 'rating', score = s[field];
      const choices = wishlist ? [1, 2, 3, 4, 5] : Array.from({ length: 11 }, function (_, i) { return i / 2; });
      const labels = '<option value="">—</option>' + choices.map(function (n) { const label = wishlist ? (n === 1 ? 'Highest' : n === 5 ? 'Lowest' : 'Priority') : tv.showRatingLabel(n); return '<option value="' + n + '"' + (score === n ? ' selected' : '') + '>' + (wishlist ? n : n.toFixed(1)) + ' · ' + esc(label) + '</option>'; }).join('');
      const avg = tv.averages(s);
      const seasonRated = s.seasons.some(function (season) { return season.rating !== null; }) || !!s.seasonRanking.trim();
      const episodeRated = s.seasons.some(function (season) { return season.episodes.some(function (episode) { return episode.rating !== null; }); });
      const indicators = (seasonRated ? '<span title="Season ratings or ranking saved" aria-label="Season ratings or ranking saved">S</span>' : '') + (episodeRated ? '<span title="Episode ratings saved" aria-label="Episode ratings saved">E</span>' : '');
      const detail = [avg.seasons.count ? 'Seasons: ' + avg.seasons.value.toFixed(1) + '/10' : '', avg.episodes.count ? 'Episodes: ' + avg.episodes.value.toFixed(1) + '/10' : '', s.seasonRanking.trim() ? 'Season ranking saved' : ''].filter(Boolean).join(' · ');
      return '<tr data-tv-id="' + s.id + '"><td><div class="tv-rating-cell"><span class="tv-rating-select"><span class="' + (score === null ? '' : wishlist ? 'movie-priority' : 'movie-score') + '" style="' + (score === null ? '' : 'background:' + App.movies.color(score, wishlist)) + '" aria-hidden="true">' + (score === null ? '—' : wishlist ? score : score.toFixed(1)) + '</span><select data-tv-edit="' + field + '" aria-label="' + (wishlist ? 'Priority' : 'Show rating') + ' for ' + esc(s.title) + '">' + labels + '</select></span>' + (indicators ? '<button type="button" class="tv-rating-indicators" data-tv-open="' + s.id + '" title="' + esc(detail) + '" aria-label="Open saved season and episode ratings for ' + esc(s.title) + '">' + indicators + '</button>' : '') + '</div></td><td>' + (s.voteAverage === null ? '—' : '<span class="movie-score ave-' + App.movies.averageBand(s.voteAverage) + '" title="TMDB average out of 10">' + s.voteAverage.toFixed(1) + '</span>') + '</td><td><div class="tv-show-cell"><button type="button" class="tv-title-button" data-tv-open="' + s.id + '">' + esc(s.title) + '</button>' + (s.tmdbId ? '<span class="tv-show-actions"><button type="button" class="tv-row-refresh" data-tv-refresh-id="' + s.id + '"' + (batch ? ' disabled' : '') + ' aria-label="Refresh show ' + esc(s.title) + '" title="Refresh this show">' + App.icons.markup('tvRefresh') + '</button><a href="https://www.themoviedb.org/tv/' + s.tmdbId + '" target="_blank" rel="noopener noreferrer" aria-label="Open ' + esc(s.title) + ' on TMDB" title="Open on TMDB">' + App.icons.markup('tvLink') + '</a></span>' : '') + '</div></td><td><span class="tv-network-pills">' + (s.networks.map(networkPill).join('') || '—') + '</span></td>'
        + '<td><span class="tv-status-cell"><span class="tv-status-label tv-tone-' + tone(viewingStatus) + '" aria-hidden="true">' + esc(viewingStatus) + '</span><select class="tv-tone-' + tone(viewingStatus) + '" data-tv-edit="status" aria-label="My status for ' + esc(s.title) + '">' + options(tv.statuses, viewingStatus) + '</select></span></td>'
        + ['providerStatus', 'numberOfSeasons', 'numberOfEpisodes'].map(function (key) { const cell = value(s, key); return '<td class="tv-tone-' + (key === 'providerStatus' ? tone(cell) : 'default') + '">' + esc(cell ?? '—') + '</td>'; }).join('')
        + '<td>' + progressCell(s, progress) + '</td>'
        + '<td title="' + esc(progress.releasedLabel ? 'Latest aired regular episode' : 'Refresh episode details to find the latest release') + '">' + esc(progress.releasedLabel || '—') + '</td>'
        + '<td>' + esc(value(s, 'lastAirDate') || '—') + '</td>'
        + ['type', 'genres'].map(function (key) { return '<td title="' + esc(value(s, key) || '') + '">' + esc(value(s, key) || '—') + '</td>'; }).join('')
        + '<td><button type="button" class="tv-title-button" data-tv-open="' + s.id + '" title="' + esc(s.notes) + '">' + esc(s.notes || 'Add notes') + '</button></td></tr>';
    }).join('');
    $('#tvCount').textContent = rows.length + ' / ' + shows.length;
    $('#tvEmpty').hidden = rows.length > 0; $('#tvEmpty').textContent = shows.length ? 'No shows match this filter.' : 'Add a show to start your TV library.';
    const tab = $('[data-shelf="tv"]'); if (tab) { tab.querySelector('.shelf-tab-count').textContent = shows.length; tab.setAttribute('aria-label', 'TV, ' + shows.length + ' shows'); }
  }
  function update(id, field, value) {
    App.storage.mutate(function (s) { const show = s.workspace.tvShows.find(function (x) { return x.id === id && !x.deleted; }); if (show) show[field] = value; }, { reason: 'tv-edit' });
  }
  function resizedWidths(key, width) {
    const widths = Object.fromEntries(columns.map(function (c) { return [c[0], columnWidth(c)]; }));
    widths[key] = Math.round(Math.max(key === 'title' ? contentWidth('title') : isCountColumn(key) ? 40 : 65, Math.min(2000, width)));
    return widths;
  }
  function setWidth(key, width) { preference({ widths: resizedWidths(key, width) }); }
  function fit(key) {
    const index = columns.findIndex(function (c) { return c[0] === key; });
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'); ctx.font = getComputedStyle($('#tvTable')).font;
    const lengths = saved().map(function (s) { return ctx.measureText(String(value(s, key) ?? '—')).width + 36; });
    setWidth(key, Math.max(columns[index][2], ...lengths));
  }
  async function refreshShows(id) {
    if (batch) return;
    const shows = saved().filter(function (s) { return s.tmdbId && (!id || s.id === id); });
    if (id && App.tvEditor.isEditing(id)) { setBatchStatus('Save or close this show’s editor before refreshing it.'); return; }
    if (!shows.length) { setBatchStatus('No linked shows to refresh. Find a TMDB match in a show’s editor.'); return; }
    if (!App.tmdb.token()) { setBatchStatus('Save a token in Settings → Data Sync → TMDB Lookup Settings first.'); return; }
    if (navigator.onLine === false) { setBatchStatus('You’re offline. Saved shows and ratings can still be edited.'); return; }
    const controller = new AbortController(); batch = controller;
    $('#tvStop').hidden = false; $('#tvRefresh').disabled = true; setBatchStatus('Preparing recovery…'); render();
    if (id) $('#tvStop').focus();
    let updated = 0, skipped = 0, errorMessage = '';
    try {
      const before = u.stableJson(state());
      if (!await App.storage.saveRecoveryAsync(id ? 'Before refreshing TV show: ' + shows[0].title : 'Before refreshing all TV shows')) throw new Error('Could not save recovery. No shows were changed.');
      if (u.stableJson(state()) !== before) throw new Error('Saved data changed while preparing recovery. Refresh again.');
      for (let index = 0; index < shows.length; index++) {
        if (controller.signal.aborted) break;
        const old = shows[index];
        setBatchStatus(id ? 'Refreshing ' + old.title + '…' : 'Refreshing all ' + shows.length + ' linked shows · ' + (index + 1) + '/' + shows.length + ': ' + old.title);
        if (App.tvEditor.isEditing(old.id)) { skipped++; continue; }
        const snapshot = u.stableJson(old), fresh = await App.tmdb.tvDetailsWithProgress(old, controller.signal);
        if (controller.signal.aborted) break;
        const current = saved().find(function (s) { return s.id === old.id; });
        if (!current || snapshot !== u.stableJson(current) || App.tvEditor.isEditing(old.id)) { skipped++; continue; }
        const merged = tv.refresh(current, fresh);
        const next = u.clone(state()), position = next.workspace.tvShows.findIndex(function (s) { return s.id === old.id; });
        next.workspace.tvShows[position] = merged;
        App.storage.replace(next, { saveRecovery: false, reason: 'tv-refresh' });
        updated++;
      }
    } catch (error) { if (error.name !== 'AbortError') errorMessage = error.message; }
    finally {
      const restoreFocus = document.activeElement === $('#tvStop') || document.activeElement === document.body;
      batch = null; $('#tvStop').hidden = true; $('#tvRefresh').disabled = false; render();
      if (restoreFocus) ($('#tvTable').querySelector('[data-tv-refresh-id="' + id + '"]') || $('#tvRefresh')).focus();
      setBatchStatus((controller.signal.aborted ? 'Stopped. ' : '') + updated + ' of ' + shows.length + ' shows refreshed; ' + skipped + ' skipped because they were being edited or changed. ' + errorMessage);
    }
  }
  async function clearLegacyNotes() {
    const key = App.config.storage.stateKey + ':tv-notes-cleanup-20260929';
    let marked = false;
    try {
      if (localStorage.getItem(key)) return;
      if (saved().some(function (s) { return s.notes; })) {
        const before = u.stableJson(state());
        if (!await App.storage.saveRecoveryAsync('Before September 29 TV notes reset')) throw new Error('Could not save recovery; TV notes were kept.');
        if (u.stableJson(state()) !== before) throw new Error('TV notes reset paused because data changed. Reload to retry.');
        const next = u.clone(state());
        next.workspace.tvShows.forEach(function (show) { if (!show.deleted) show.notes = ''; });
        // Mark before replacement so recovery never causes a second cleanup.
        localStorage.setItem(key, 'done'); marked = true;
        App.storage.replace(next, { saveRecovery: false, reason: 'tv-notes-cleanup' });
      } else localStorage.setItem(key, 'done');
    } catch (error) {
      // Failed replacements leave the original state intact and may safely retry.
      if (marked) localStorage.removeItem(key);
      setBatchStatus(error.message);
    }
  }
  async function init() {
    const workspace = $('#tvWorkspace'), header = $('.app-header'), controls = $('.tv-sticky-controls');
    const measureSticky = function () {
      workspace.style.setProperty('--tv-header-height', header.getBoundingClientRect().height + 'px');
      workspace.style.setProperty('--tv-controls-height', controls.getBoundingClientRect().height + 'px');
    };
    const stickyObserver = new ResizeObserver(measureSticky); stickyObserver.observe(header); stickyObserver.observe(controls); measureSticky();
    $('#tvStatusDismiss').addEventListener('click', function () { setBatchStatus(''); ($('#tvStop').hidden ? $('#tvRefresh') : $('#tvStop')).focus(); });

    $('#tvFilter').innerHTML = '<option value="all">All shows</option>' + options(tv.statuses, pref().filter);
    await clearLegacyNotes();
    App.tvPivotsUI.init();
    $('#tvFiltersButton').addEventListener('click', function () { requestAnimationFrame(balanceFilters); });
    let lastFilterWidth = 0;
    new ResizeObserver(function (entries) { const width = entries[0].contentRect.width; if (width !== lastFilterWidth) { lastFilterWidth = width; requestAnimationFrame(balanceFilters); } }).observe($('#tvPivots'));
    document.querySelectorAll('[data-tv-view]').forEach(function (button) { button.addEventListener('click', function () { preference({ view: button.dataset.tvView }); }); });
    $('#tvPivots').addEventListener('click', function (event) { const button = event.target.closest('[data-tv-pivot]'); if (!button) return; const next = { key: button.dataset.tvPivot, value: button.dataset.value }; pivot = pivot && pivot.key === next.key && pivot.value === next.value ? null : next; preference({ view: 'list' }); });
    $('#tvAdd').addEventListener('click', function () { App.tvEditor.open(null, this); });
    $('#tvFilter').addEventListener('change', function () { preference({ filter: this.value }); });
    $('#tvSearch').addEventListener('input', function () { preference({ query: this.value }); });
    $('#tvRefresh').addEventListener('click', function () { refreshShows(); }); $('#tvStop').addEventListener('click', function () { batch?.abort(); });
    $('#tvTable').addEventListener('click', function (event) {
      const refresh = event.target.closest('[data-tv-refresh-id]');
      if (refresh) { refreshShows(refresh.dataset.tvRefreshId); return; }
      const step = event.target.closest('[data-tv-advance]');
      if (step) { advance(step.closest('[data-tv-id]').dataset.tvId, step.dataset.tvAdvance === 'all', step.dataset.tvAdvance); return; }
      const open = event.target.closest('[data-tv-open]'); if (open) App.tvEditor.open(open.dataset.tvOpen, open);
      const sort = event.target.closest('[data-tv-sort]'); if (sort) { const key = sort.dataset.tvSort; preference({ sort: key, direction: pref().sort === key && pref().direction === 'asc' ? 'desc' : 'asc' }); $('#tvTable').querySelector('[data-tv-sort="' + key + '"]').focus(); }
    });
    $('#tvTable').addEventListener('change', function (event) {
      const field = event.target.dataset.tvEdit; if (!field) return;
      const id = event.target.closest('[data-tv-id]').dataset.tvId;
      update(id, field, ['rating', 'priority'].includes(field) ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value);
      const control = $('#tvTable').querySelector('[data-tv-id="' + id + '"] [data-tv-edit="' + field + '"]'); control?.focus();
    });
    $('#tvTable').addEventListener('dblclick', function (event) { const h = event.target.closest('[data-tv-resize]'); if (h) fit(h.dataset.tvResize); });
    $('#tvTable').addEventListener('keydown', function (event) {
      const h = event.target.closest('[data-tv-resize]'); if (!h) return;
      const key = h.dataset.tvResize;
      if (event.key === 'Enter') { event.preventDefault(); fit(key); }
      else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setWidth(key, h.closest('th').offsetWidth + (event.key === 'ArrowRight' ? 12 : -12)); }
      else return;
      $('#tvTable').querySelector('[data-tv-resize="' + key + '"]').focus();
    });
    $('#tvTable').addEventListener('pointerdown', function (event) {
      const h = event.target.closest('[data-tv-resize]'); if (!h || event.button !== 0) return;
      event.preventDefault(); const key = h.dataset.tvResize, start = event.clientX, width = h.closest('th').offsetWidth;
      let next = width;
      resizing = true; h.setPointerCapture(event.pointerId);
      const move = function (e) {
        const widths = resizedWidths(key, width + e.clientX - start); next = widths[key];
        columns.forEach(function (c) { $('#tvTable').querySelector('[data-tv-col="' + c[0] + '"]').style.width = widths[c[0]] + 'px'; });
        $('#tvTable').style.width = Object.values(widths).reduce(function (a, b) { return a + b; }, 0) + 'px';
      };
      const end = function () { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', end); h.removeEventListener('pointercancel', end); resizing = false; if (next !== width) setWidth(key, next); };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    });
    window.addEventListener('app:statechange', function (event) {
      if (['import', 'sync-download', 'sync-merge', 'recovery', 'erase-all', 'restore-demo'].includes(event.detail.reason)) batch?.abort();
      if (event.detail.reason === 'appearance') requestAnimationFrame(render);
      if (!resizing && (event.detail.reason.startsWith('tv-') || ['import', 'sync-download', 'sync-merge', 'recovery', 'erase-all', 'reset-preferences', 'restore-demo'].includes(event.detail.reason))) render();
    });
    window.addEventListener('resize', u.debounce(function () { if (!resizing) render(); }, 100));
    render();
  }
  App.tvUI = { init: init, render: render, networkPill: networkPill };
})();
