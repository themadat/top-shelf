(function () {
  'use strict';
  const App = window.LocalApp, model = App.subgenres, esc = App.utils.escapeHtml;
  const $ = function (selector) { return document.querySelector(selector); };
  const movies = function () { return App.storage.getState().workspace.movies; };
  let pending = null, reviewed = null, generation = 0;
  function clear() { pending = null; reviewed = null; $('#subgenreApply').disabled = true; $('#subgenrePreview').textContent = ''; $('#subgenreError').textContent = ''; }
  function render() {
    const items = movies(), queue = model.queue(items), supported = model.vocabulary(items);
    $('#subgenreReviewButton .button-label').textContent = 'Subgenre Review (' + queue.length + ')';
    $('#subgenreReviewButton').setAttribute('aria-label', 'Subgenre Review (' + queue.length + ')');
    $('#subgenreReviewSummary').textContent = queue.length + ' movies need review · ' + supported.length + ' supported subgenres';
    $('#subgenreQueue').innerHTML = queue.map(function (movie) { return '<li>' + esc(movie.title) + ' (' + esc(movie.releaseDate.slice(0, 4) || '????') + ') · TMDB ' + movie.tmdbId + '</li>'; }).join('') || '<li>All movies have been reviewed.</li>';
    $('#subgenreVocabulary').innerHTML = supported.map(function (name) { return '<li>' + esc(name) + '</li>'; }).join('') || '<li>Add Subgenre: Name tags in Other Pivots to define supported subgenres first.</li>';
    $('#subgenreExport').disabled = !queue.length || !supported.length;
  }
  function showPreview() {
    reviewed = model.preview(movies(), pending);
    const count = reviewed.filter(function (row) { return row.change; }).length;
    $('#subgenrePreview').innerHTML = '<h3>' + count + ' Movies to Mark Reviewed</h3><ul>' + reviewed.map(function (row) { return '<li><strong>' + esc(row.title) + '</strong>: ' + (row.change ? row.added.length ? 'Add ' + esc(row.added.join(', ')) : 'Reviewed; no new subgenres' : row.wasReviewed ? 'Already reviewed; unchanged' : 'Uncertain; stays pending') + '</li>'; }).join('') + '</ul>';
    $('#subgenreApply').disabled = !count;
  }
  function init() {
    $('#subgenreReviewButton').addEventListener('click', function (event) { generation++; clear(); render(); $('#subgenreImport').value = ''; App.components.openDialog('#subgenreReviewDialog', { trigger: event.currentTarget, focus: '#subgenreExport' }); });
    $('#subgenreReviewDialog').addEventListener('close', function () { generation++; clear(); });
    $('#subgenreExport').addEventListener('click', function () {
      const url = URL.createObjectURL(new Blob([JSON.stringify(model.request(movies()), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'top-shelf-subgenre-review-request.json'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    });
    $('#subgenreImport').addEventListener('change', async function (event) {
      const sequence = ++generation, file = event.target.files[0]; clear(); if (!file) return;
      try {
        if (file.size > App.config.controls.maxImportBytes) throw new Error('This file exceeds the import size limit.');
        const text = await file.text(); if (sequence !== generation) return;
        pending = JSON.parse(text); showPreview();
      } catch (error) { clear(); $('#subgenreError').textContent = error.message; }
    });
    $('#subgenreApply').addEventListener('click', function () {
      if (!pending || !reviewed) return;
      try {
        const current = model.preview(movies(), pending);
        if (JSON.stringify(current) !== JSON.stringify(reviewed)) { showPreview(); $('#subgenreError').textContent = 'Movie data changed. Review the refreshed preview before applying.'; return; }
        if (!App.storage.saveRecovery('Before subgenre review import')) throw new Error('Could not save a recovery copy. No movies were changed.');
        const changes = new Map(current.filter(function (row) { return row.change; }).map(function (row) { return [row.id, row]; }));
        App.storage.mutate(function (next) { next.workspace.movies = next.workspace.movies.map(function (movie) { const change = changes.get(movie.id); return change ? App.movies.normalize(Object.assign({}, movie, { other: change.other, subgenreReviewed: true })) : movie; }); }, { reason: 'subgenre-review' });
        const persisted = App.storage.saveNow(); clear(); render();
        $('#subgenreReviewSummary').textContent = changes.size + ' movies reviewed. ' + model.queue(movies()).length + ' still pending.';
        App.components.toast(persisted ? 'Subgenre reviews saved.' : 'Updates kept for this session. Export a backup before closing.', { title: persisted ? 'Saved' : 'Storage unavailable', kind: persisted ? 'success' : 'warning' });
      } catch (error) { $('#subgenreApply').disabled = true; $('#subgenreError').textContent = error.message; }
    });
    window.addEventListener('app:statechange', function (event) { if (event.detail?.reason !== 'edit-document') render(); }); render();
  }
  App.subgenresUI = { init: init };
})();
