(function () {
  'use strict';
  const App = window.LocalApp, esc = App.utils.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  let input = null, preview = null, generation = 0;
  function state() { return App.storage.getState().workspace.tvShows; }
  function selected() { return Array.from($('#tvImportRows').querySelectorAll('input:checked')).map(function (el) { return el.value; }); }
  function counts() {
    const count = selected().length;
    $('#tvImportApply').disabled = !count;
    $('#tvImportSummary').textContent = count + ' shows selected to add or link · ' + preview.entries.filter(function (e) { return e.skip; }).length + ' existing/deleted shows skipped. Existing ratings, statuses, notes, and detailed scores stay unchanged.';
  }
  async function read(file) {
    const sequence = ++generation; input = null; preview = null;
    $('#tvImportApply').disabled = true; $('#tvImportRows').innerHTML = ''; $('#tvImportSummary').textContent = ''; $('#tvImportError').textContent = '';
    if (!file) return;
    try {
      if (file.size > App.config.controls.maxImportBytes) throw new Error('Choose a TV import file smaller than 5 MiB.');
      const text = await file.text(); if (sequence !== generation) return;
      let parsed; try { parsed = JSON.parse(text); } catch (error) { throw new Error('This file is not valid JSON.'); }
      const result = App.tvImport.preview(state(), parsed); input = parsed; preview = result;
      $('#tvImportRows').innerHTML = result.entries.map(function (entry) {
        const s = entry.show;
        return '<tr><td><input type="checkbox" value="' + s.id + '" aria-label="Import ' + esc(s.title) + '"' + (entry.skip ? ' disabled' : ' checked') + '></td><td>' + esc(s.title) + '</td><td>' + (s.rating === null ? 'Unrated' : s.rating + ' · ' + esc(App.tv.showLabels[s.rating])) + '</td><td>' + esc(s.status) + '</td><td>' + esc(App.tv.seriesStatus(s)) + '</td><td class="tv-import-notes">' + esc(s.notes) + '</td><td>' + entry.reason + '</td></tr>';
      }).join('');
      counts();
    } catch (error) { $('#tvImportError').textContent = error.message; }
  }
  function apply() {
    try {
      if (!preview || !input) return;
      const priorShows = App.utils.clone(state()), priorMeta = App.utils.clone(App.storage.getState().meta);
      const result = App.tvImport.apply(priorShows, input, preview.snapshot, selected());
      App.storage.mutate(function (s) { s.workspace.tvShows = result.shows; }, { save: false, reason: 'tv-import' });
      if (!App.storage.saveNow()) {
        App.storage.mutate(function (s) { s.workspace.tvShows = priorShows; s.meta = priorMeta; }, { save: false, touch: false, reason: 'tv-import-rollback' });
        App.storage.saveNow();
        throw new Error('Browser storage could not save the imported TV IDs. The in-memory change was rolled back; your saved library is unchanged.');
      }
      App.components.closeDialog('#tvImportDialog');
      App.components.toast('Added ' + result.count + ' shows and linked ' + result.linked + ' existing shows. Use Refresh Show Data to fetch TMDB columns.', { title: 'TV import complete', kind: 'success' });
    } catch (error) { $('#tvImportError').textContent = error.message; $('#tvImportApply').disabled = true; }
  }
  function init() {
    $('#tvImportButton').addEventListener('click', function () {
      generation++; input = null; preview = null;
      $('#tvImportFile').value = ''; $('#tvImportRows').innerHTML = ''; $('#tvImportSummary').textContent = ''; $('#tvImportError').textContent = ''; $('#tvImportApply').disabled = true;
      App.components.openDialog('#tvImportDialog', { trigger: this, focus: '#tvImportFile' });
    });
    $('#tvImportFile').addEventListener('change', function () { read(this.files[0]); });
    $('#tvImportRows').addEventListener('change', counts);
    $('#tvImportApply').addEventListener('click', apply);
    $('#tvImportDialog').addEventListener('close', function () { generation++; input = null; preview = null; });
  }
  App.tvImportUI = { init: init };
})();
