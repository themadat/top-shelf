(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, tv = App.tv, esc = u.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  const columns = [['rating', 'Rating', 100], ['title', 'Show', 250], ['status', 'My Status', 140], ['seriesStatus', 'Series Status', 115], ['mode', 'Rate By', 110], ['seasons', 'Seasons', 80], ['lastWatched', 'Last Watched', 120], ['notes', 'Notes', 140]];
  let batch = null, resizing = false;
  function state() { return App.storage.getState(); }
  function saved() { return state().workspace.tvShows.filter(function (s) { return !s.deleted; }); }
  function pref() { return state().ui.tv; }
  function preference(patch) { App.storage.mutate(function (s) { Object.assign(s.ui.tv, patch); }, { touch: false, reason: 'tv-preference' }); }
  function options(items, value) { return items.map(function (s) { return '<option' + (s === value ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join(''); }
  function value(show, key) { return key === 'seriesStatus' ? tv.seriesStatus(show) : key === 'seasons' ? show.seasons.filter(function (s) { return s.number > 0; }).length : show[key]; }
  function render() {
    const shows = saved(), p = pref(), needle = p.query.toLowerCase();
    $('#tvSearch').value = p.query; $('#tvFilter').value = p.filter;
    const rows = shows.filter(function (s) { return (p.filter === 'all' || s.status === p.filter) && (!needle || tv.searchable(s).includes(needle)); });
    rows.sort(function (a, b) {
      const av = value(a, p.sort), bv = value(b, p.sort);
      if (av === null || bv === null) return av === bv ? a.title.localeCompare(b.title) : av === null ? 1 : -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return cmp * (p.direction === 'asc' ? 1 : -1) || a.title.localeCompare(b.title);
    });
    const widths = columns.map(function (c) { return p.widths[c[0]] || c[2]; });
    $('#tvTable').style.width = widths.reduce(function (a, b) { return a + b; }, 0) + 'px';
    $('#tvTable colgroup').innerHTML = columns.map(function (c, i) { return '<col data-tv-col="' + c[0] + '" style="width:' + widths[i] + 'px">'; }).join('');
    $('#tvTable thead').innerHTML = '<tr>' + columns.map(function (c) {
      return '<th scope="col" aria-sort="' + (p.sort === c[0] ? (p.direction === 'asc' ? 'ascending' : 'descending') : 'none') + '"><button type="button" data-tv-sort="' + c[0] + '">' + c[1] + (p.sort === c[0] ? (p.direction === 'asc' ? ' ↑' : ' ↓') : '') + '</button><button type="button" class="tv-resize" data-tv-resize="' + c[0] + '" aria-label="Resize ' + c[1] + ' column" title="Drag to resize. Double-click to fit. Arrow keys resize; Enter fits."></button></th>';
    }).join('') + '</tr>';
    $('#tvTable tbody').innerHTML = rows.map(function (s) {
      const labels = '<option value="">—</option>' + tv.showLabels.map(function (label, i) { return '<option value="' + i + '"' + (s.rating === i ? ' selected' : '') + '>' + i + ' · ' + esc(label) + '</option>'; }).join('');
      const avg = tv.averages(s), detail = [avg.seasons.count ? 'S ' + avg.seasons.value.toFixed(1) + '/10 (' + avg.seasons.count + ')' : '', avg.episodes.count ? 'E ' + avg.episodes.value.toFixed(1) + '/10 (' + avg.episodes.count + ')' : ''].filter(Boolean).join(' · ');
      return '<tr data-tv-id="' + s.id + '"><td><select data-tv-edit="rating" aria-label="Show rating for ' + esc(s.title) + '">' + labels + '</select></td><td><button type="button" class="tv-title-button" data-tv-open="' + s.id + '">' + esc(s.title) + '</button><small class="tv-table-averages" title="Season and episode averages with rated counts">' + esc(detail) + '</small></td>'
        + '<td><select data-tv-edit="status" aria-label="My status for ' + esc(s.title) + '">' + options(tv.statuses, s.status) + '</select></td><td>' + esc(tv.seriesStatus(s)) + '</td><td><select data-tv-edit="mode" aria-label="Rate by for ' + esc(s.title) + '">' + options(tv.modes, s.mode) + '</select></td><td>' + value(s, 'seasons') + '</td><td title="' + esc(s.lastWatched) + '">' + esc(s.lastWatched || '—') + '</td><td><button type="button" class="tv-title-button" data-tv-open="' + s.id + '" title="' + esc(s.notes) + '">' + esc(s.notes || 'Add notes') + '</button></td></tr>';
    }).join('');
    $('#tvCount').textContent = rows.length + ' / ' + shows.length;
    $('#tvEmpty').hidden = rows.length > 0; $('#tvEmpty').textContent = shows.length ? 'No shows match this filter.' : 'Add a show to start your TV library.';
    const tab = $('[data-shelf="tv"]'); if (tab) { tab.querySelector('.shelf-tab-count').textContent = shows.length; tab.setAttribute('aria-label', 'TV, ' + shows.length + ' shows'); }
  }
  function update(id, field, value) {
    App.storage.mutate(function (s) { const show = s.workspace.tvShows.find(function (x) { return x.id === id && !x.deleted; }); if (show) show[field] = value; }, { reason: 'tv-edit' });
  }
  function setWidth(key, width) {
    const widths = Object.assign({}, pref().widths, { [key]: Math.round(Math.max(65, Math.min(2000, width))) }); preference({ widths: widths });
  }
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
  function init() {
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
      event.preventDefault(); const key = h.dataset.tvResize, start = event.clientX, width = h.closest('th').offsetWidth, total = $('#tvTable').offsetWidth;
      const col = $('#tvTable').querySelector('[data-tv-col="' + key + '"]'); let next = width;
      resizing = true; h.setPointerCapture(event.pointerId);
      const move = function (e) { next = Math.max(65, Math.min(2000, width + e.clientX - start)); col.style.width = next + 'px'; $('#tvTable').style.width = total + next - width + 'px'; };
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
