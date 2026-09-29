(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, tv = App.tv, esc = u.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  const columns = [['rating', '#', 105], ['voteAverage', 'Ave', 75], ['title', 'Show', 250], ['status', 'My Status', 140], ['providerStatus', 'Show Status', 140], ['lastAirDate', 'Last Air', 110], ['type', 'Type', 100], ['genres', 'Genres', 180], ['numberOfSeasons', 'S', 65], ['numberOfEpisodes', 'E', 65], ['networks', 'Networks', 160], ['notes', 'Notes', 140]];
  let batch = null, resizing = false, pivot = null;
  function tone(value) { return ({ 'Want to Watch': 'gold', Watching: 'blue', 'Caught Up': 'green', Completed: 'purple', Stopped: 'red', Active: 'green', Ended: 'purple', Canceled: 'red', Upcoming: 'blue' })[value] || 'muted'; }
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
    return show[key];
  }
  function render() {
    const shows = saved(), p = pref(), needle = p.query.toLowerCase();
    const filtersView = p.view === 'pivots';
    $('#tvListView').hidden = filtersView; $('#tvPivotsView').hidden = !filtersView;
    document.querySelectorAll('[data-tv-view]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.tvView === (filtersView ? 'pivots' : 'list'))); });
    $('#tvSearch').value = p.query; $('#tvFilter').value = p.filter;
    const rows = shows.filter(function (s) { return (p.filter === 'all' || s.status === p.filter) && (!needle || tv.searchable(s).includes(needle)) && (!pivot || (pivot.key === 'type' ? s.type === pivot.value : s[pivot.key].includes(pivot.value))); });
    rows.sort(function (a, b) {
      const av = value(a, p.sort), bv = value(b, p.sort);
      const tie = function () { return (p.sort === 'rating' ? 0 : (b.rating ?? -1) - (a.rating ?? -1)) || a.title.localeCompare(b.title); };
      if (av === null || bv === null) return av === bv ? tie() : av === null ? 1 : -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return cmp * (p.direction === 'asc' ? 1 : -1) || tie();
    });
    renderPivots(shows);
    App.tvPivotsUI.render(shows);
    const widths = columns.map(function (c) { return p.widths[c[0]] || c[2]; });
    $('#tvTable').style.width = widths.reduce(function (a, b) { return a + b; }, 0) + 'px';
    $('#tvTable colgroup').innerHTML = columns.map(function (c, i) { return '<col data-tv-col="' + c[0] + '" style="width:' + widths[i] + 'px">'; }).join('');
    $('#tvTable thead').innerHTML = '<tr>' + columns.map(function (c) {
      return '<th scope="col" aria-sort="' + (p.sort === c[0] ? (p.direction === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-tv-sort="' + c[0] + '">' + c[1] + (p.sort === c[0] ? (p.direction === 'asc' ? ' ↑' : ' ↓') : '') + '</button><button type="button" class="tv-resize" data-tv-resize="' + c[0] + '" aria-label="Resize ' + c[1] + ' column" title="Drag to resize. Double-click to fit. Arrow keys resize; Enter fits."></button></th>';
    }).join('') + '</tr>';
    $('#tvTable tbody').innerHTML = rows.map(function (s) {
      const labels = '<option value="">—</option>' + tv.showLabels.map(function (label, i) { return '<option value="' + i + '"' + (s.rating === i ? ' selected' : '') + '>' + i + ' · ' + esc(label) + '</option>'; }).join('');
      const avg = tv.averages(s);
      const seasonRated = s.seasons.some(function (season) { return season.rating !== null; }) || !!s.seasonRanking.trim();
      const episodeRated = s.seasons.some(function (season) { return season.episodes.some(function (episode) { return episode.rating !== null; }); });
      const indicators = (seasonRated ? '<span title="Season ratings or ranking saved" aria-label="Season ratings or ranking saved">S</span>' : '') + (episodeRated ? '<span title="Episode ratings saved" aria-label="Episode ratings saved">E</span>' : '');
      const detail = [avg.seasons.count ? 'Seasons: ' + avg.seasons.value.toFixed(1) + '/10' : '', avg.episodes.count ? 'Episodes: ' + avg.episodes.value.toFixed(1) + '/10' : '', s.seasonRanking.trim() ? 'Season ranking saved' : ''].filter(Boolean).join(' · ');
      return '<tr data-tv-id="' + s.id + '"><td><div class="tv-rating-cell"><span class="tv-rating-select"><span class="' + (s.rating === null ? '' : 'movie-score') + '" style="' + (s.rating === null ? '' : 'background:' + App.movies.color(s.rating, false)) + '" aria-hidden="true">' + (s.rating ?? '—') + '</span><select data-tv-edit="rating" aria-label="Show rating for ' + esc(s.title) + '">' + labels + '</select></span>' + (indicators ? '<button type="button" class="tv-rating-indicators" data-tv-open="' + s.id + '" title="' + esc(detail) + '" aria-label="Open saved season and episode ratings for ' + esc(s.title) + '">' + indicators + '</button>' : '') + '</div></td><td>' + (s.voteAverage === null ? '—' : '<span class="movie-score ave-' + App.movies.averageBand(s.voteAverage) + '" title="TMDB average out of 10">' + s.voteAverage.toFixed(1) + '</span>') + '</td><td><button type="button" class="tv-title-button" data-tv-open="' + s.id + '">' + esc(s.title) + '</button></td>'
        + '<td><select class="tv-tone-' + tone(s.status) + '" data-tv-edit="status" aria-label="My status for ' + esc(s.title) + '">' + options(tv.statuses, s.status) + '</select></td>'
        + ['providerStatus', 'lastAirDate', 'type', 'genres', 'numberOfSeasons', 'numberOfEpisodes', 'networks'].map(function (key) { const cell = key === 'voteAverage' && s.voteAverage !== null ? s.voteAverage.toFixed(1) : value(s, key); return '<td class="tv-tone-' + (key === 'providerStatus' ? tone(cell) : 'default') + '" title="' + esc(cell ?? '') + '">' + (key === 'voteAverage' && s.voteAverage !== null ? '<span class="movie-score ave-' + App.movies.averageBand(s.voteAverage) + '">' + cell + '</span>' : esc(cell ?? '—')) + '</td>'; }).join('')
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
    const widths = Object.fromEntries(columns.map(function (c) { return [c[0], pref().widths[c[0]] || c[2]]; }));
    const index = columns.findIndex(function (c) { return c[0] === key; }), right = columns[index + 1]?.[0];
    let next = Math.round(Math.max(65, Math.min(2000, width)));
    if (right) {
      const delta = Math.max(widths[right] - 2000, Math.min(widths[right] - 65, next - widths[key]));
      next = widths[key] + delta; widths[right] -= delta;
    }
    widths[key] = next;
    return widths;
  }
  function setWidth(key, width) { preference({ widths: resizedWidths(key, width) }); }
  function fit(key) {
    const index = columns.findIndex(function (c) { return c[0] === key; });
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'); ctx.font = getComputedStyle($('#tvTable')).font;
    const lengths = saved().map(function (s) { return ctx.measureText(String(value(s, key) ?? '—')).width + 36; });
    setWidth(key, Math.max(columns[index][2], ...lengths));
  }
  async function refreshAll() {
    if (batch) return;
    const shows = saved().filter(function (s) { return s.tmdbId; });
    const message = $('#tvBatchStatus');
    if (!shows.length) { message.textContent = 'No linked shows to refresh. Find a TMDB match in a show’s editor.'; return; }
    if (!App.tmdb.token()) { message.textContent = 'Save a token in Settings → TMDB Lookup Settings first.'; return; }
    if (navigator.onLine === false) { message.textContent = 'You’re offline. Saved shows and ratings can still be edited.'; return; }
    if (!App.storage.saveRecovery('Before refreshing all TV shows')) { message.textContent = 'Could not save recovery. No shows were changed.'; return; }
    const controller = new AbortController(); batch = controller;
    $('#tvStop').hidden = false; $('#tvRefresh').disabled = true;
    let updated = 0, skipped = 0, errorMessage = '';
    try {
      for (let index = 0; index < shows.length; index++) {
        if (controller.signal.aborted) break;
        const old = shows[index];
        message.textContent = 'Refreshing all ' + shows.length + ' linked shows · ' + (index + 1) + '/' + shows.length + ': ' + old.title;
        if (App.tvEditor.isEditing(old.id)) { skipped++; continue; }
        const snapshot = u.stableJson(old), fresh = await App.tmdb.tvDetails(old.tmdbId, controller.signal);
        if (controller.signal.aborted) break;
        const current = saved().find(function (s) { return s.id === old.id; });
        if (!current || snapshot !== u.stableJson(current) || App.tvEditor.isEditing(old.id)) { skipped++; continue; }
        const merged = tv.refresh(current, fresh);
        App.storage.mutate(function (s) { const i = s.workspace.tvShows.findIndex(function (x) { return x.id === old.id; }); s.workspace.tvShows[i] = merged; }, { reason: 'tv-refresh' });
        updated++; App.storage.saveNow();
      }
    } catch (error) { if (error.name !== 'AbortError') errorMessage = error.message; }
    finally {
      batch = null; $('#tvStop').hidden = true; $('#tvRefresh').disabled = false;
      message.textContent = (controller.signal.aborted ? 'Stopped. ' : '') + updated + ' of ' + shows.length + ' shows refreshed; ' + skipped + ' skipped because they were being edited or changed. ' + errorMessage;
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
      $('#tvBatchStatus').textContent = error.message;
    }
  }
  async function init() {
    await clearLegacyNotes();
    App.tvPivotsUI.init();
    $('#tvFiltersDisclosure').addEventListener('toggle', balanceFilters);
    let lastFilterWidth = 0;
    new ResizeObserver(function (entries) { const width = entries[0].contentRect.width; if (width !== lastFilterWidth) { lastFilterWidth = width; requestAnimationFrame(balanceFilters); } }).observe($('#tvPivots'));
    document.querySelectorAll('[data-tv-view]').forEach(function (button) { button.addEventListener('click', function () { preference({ view: button.dataset.tvView }); }); });
    $('#tvPivots').addEventListener('click', function (event) { const button = event.target.closest('[data-tv-pivot]'); if (!button) return; const next = { key: button.dataset.tvPivot, value: button.dataset.value }; pivot = pivot && pivot.key === next.key && pivot.value === next.value ? null : next; preference({ view: 'list' }); });
    $('#tvAdd').addEventListener('click', function () { App.tvEditor.open(null, this); });
    $('#tvFilter').addEventListener('change', function () { preference({ filter: this.value }); });
    $('#tvSearch').addEventListener('input', function () { preference({ query: this.value }); });
    $('#tvRefresh').addEventListener('click', refreshAll); $('#tvStop').addEventListener('click', function () { batch?.abort(); });
    $('#tvTable').addEventListener('click', function (event) {
      const open = event.target.closest('[data-tv-open]'); if (open) App.tvEditor.open(open.dataset.tvOpen, open);
      const sort = event.target.closest('[data-tv-sort]'); if (sort) { const key = sort.dataset.tvSort; preference({ sort: key, direction: pref().sort === key && pref().direction === 'asc' ? 'desc' : 'asc' }); $('#tvTable').querySelector('[data-tv-sort="' + key + '"]').focus(); }
    });
    $('#tvTable').addEventListener('change', function (event) {
      const field = event.target.dataset.tvEdit; if (!field) return;
      const id = event.target.closest('[data-tv-id]').dataset.tvId;
      update(id, field, field === 'rating' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value);
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
      if (!resizing && (event.detail.reason.startsWith('tv-') || ['import', 'sync-download', 'sync-merge', 'recovery', 'erase-all', 'reset-preferences', 'restore-demo'].includes(event.detail.reason))) render();
    });
    render();
  }
  App.tvUI = { init: init, render: render };
})();
