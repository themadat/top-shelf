(function () {
  "use strict";
  const App = window.LocalApp, u = App.utils, model = App.movies;
  const $ = function (selector) { return document.querySelector(selector); };
  const esc = u.escapeHtml;
  function saved() { return App.storage.getState().workspace.movies.filter(function (movie) { return !movie.deleted; }); }
  function howValues() { return Array.from(new Set(saved().map(function (movie) { return movie.how; }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); }).join('\n'); }
  function initBulkPivots() {
    let reviewed = null;
    function invalidate() { reviewed = null; $('#bulkPivotApply').disabled = true; $('#bulkPivotPreview').textContent = ''; $('#bulkPivotError').textContent = ''; $('#bulkPivotMovies').removeAttribute('aria-invalid'); }
    function preview() {
      invalidate();
      try {
        const result = model.bulkPivots(saved(), $('#bulkPivotTags').value, $('#bulkPivotMovies').value);
        const issues = result.rows.filter(function (row) { return row.error; });
        const matched = result.rows.filter(function (row) { return !row.error; });
        const issueList = issues.length ? '<section class="bulk-pivot-issues" aria-labelledby="bulkPivotIssuesTitle"><h3 id="bulkPivotIssuesTitle">Needs Attention (' + issues.length + ')</h3><ul>' + issues.map(function (row) {
          const label = row.error.startsWith('Not found') ? 'NOT FOUND' : row.error.startsWith('Multiple matches') ? 'MULTIPLE MATCHES' : 'CANNOT APPLY';
          return '<li><span class="bulk-pivot-issue-label">' + label + '</span><strong>' + esc(row.input) + '</strong><span>' + esc(row.error) + '</span></li>';
        }).join('') + '</ul><p>Correct the movie names or use TMDB IDs in the Movies box, then review again.</p></section>' : '';
        $('#bulkPivotPreview').innerHTML = issueList + '<p>' + result.changes.length + ' movies ' + (issues.length ? 'matched for updates (not applied)' : 'to update') + '.</p>' + (matched.length ? '<details' + (issues.length ? '' : ' open') + '><summary>Matched Movies (' + matched.length + ')</summary><ul>' + matched.map(function (row) {
          return '<li><strong>' + esc(row.title || row.input) + '</strong>: ' + (row.duplicate ? 'Already included above' : row.additions.length ? 'Append ' + esc(row.additions.join(', ')) : 'No change — pivots already present') + '</li>';
        }).join('') + '</ul></details>' : '');
        if (!result.valid) {
          $('#bulkPivotError').textContent = issues.length + ' movie ' + (issues.length === 1 ? 'entry needs' : 'entries need') + ' attention. Nothing can be applied until these are resolved.';
          $('#bulkPivotMovies').setAttribute('aria-invalid', 'true');
          $('#bulkPivotError').focus();
          $('#bulkPivotError').scrollIntoView({ block: 'start' });
        }
        else if (result.changes.length) { reviewed = result; $('#bulkPivotApply').disabled = false; }
      } catch (error) { $('#bulkPivotError').textContent = error.message; }
    }
    $('#bulkPivotsButton').addEventListener('click', function (event) {
      $('#bulkPivotsForm').reset(); invalidate();
      App.components.openDialog('#bulkPivotsDialog', { trigger: event.currentTarget, focus: '#bulkPivotTags' });
    });
    $('#bulkPivotTags').addEventListener('input', invalidate);
    $('#bulkPivotMovies').addEventListener('input', invalidate);
    $('#bulkPivotReview').addEventListener('click', preview);
    $('#bulkPivotsForm').addEventListener('submit', function (event) {
      event.preventDefault();
      if (!reviewed) return;
      try {
        const current = model.bulkPivots(saved(), $('#bulkPivotTags').value, $('#bulkPivotMovies').value);
        if (JSON.stringify(current) !== JSON.stringify(reviewed)) { preview(); $('#bulkPivotError').textContent = 'Movie data changed. Review the refreshed matches before applying.'; return; }
        if (!App.storage.saveRecovery('Before bulk pivot entry')) throw new Error('Could not save a recovery copy. No movies were changed.');
        const changes = new Map(current.changes.map(function (row) { return [row.id, row.after]; }));
        App.storage.mutate(function (next) { next.workspace.movies = next.workspace.movies.map(function (movie) { return changes.has(movie.id) ? model.normalize(Object.assign({}, movie, { other: changes.get(movie.id) })) : movie; }); }, { reason: 'bulk-pivots' });
        const persisted = App.storage.saveNow();
        reviewed = null;
        App.components.closeDialog('#bulkPivotsDialog');
        App.components.toast(persisted ? changes.size + ' movies updated.' : 'Changes kept for this session. Export a backup before closing.', { title: persisted ? 'Pivots appended' : 'Storage unavailable', kind: persisted ? 'success' : 'warning' });
      } catch (error) { $('#bulkPivotError').textContent = error.message; }
    });
  }
  function bindCopy(button, text, message, refresh) {
    $(button).addEventListener('click', async function () {
      const input = $(text);
      if (refresh) input.value = refresh();
      try { await navigator.clipboard.writeText(input.value); App.components.toast(message, { title: 'Copied', kind: 'success' }); }
      catch (error) { input.focus(); input.select(); App.components.toast('List selected. Copy it using your keyboard.', { title: 'Copy List' }); }
    });
  }
  function init() {
    initBulkPivots();
    $('#movieNamesButton').addEventListener('click', function (event) {
      $('#movieNamesText').value = saved().map(function (movie) { return movie.title; }).sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }); }).join('\n');
      App.components.openDialog('#movieNamesDialog', { trigger: event.currentTarget, focus: '#movieNamesText' });
    });
    bindCopy('#movieNamesCopy', '#movieNamesText', 'Movie names copied.');
    $('#movieAnalysisButton').addEventListener('click', function (event) {
      const movies = saved();
      $('#movieAnalysisText').value = model.analysisText(movies);
      $('#movieAnalysisSummary').textContent = movies.length + ' movies · All saved details · No list filters applied';
      App.components.openDialog('#movieAnalysisDialog', { trigger: event.currentTarget, focus: '#movieAnalysisText' });
    });
    bindCopy('#movieAnalysisCopy', '#movieAnalysisText', 'Movie database copied.');
    $('#movieHowValuesButton').addEventListener('click', function (event) { $('#movieHowValuesText').value = howValues(); App.components.openDialog('#movieHowValuesDialog', { trigger: event.currentTarget, focus: '#movieHowValuesText' }); });
    bindCopy('#movieHowValuesCopy', '#movieHowValuesText', 'How values copied.', howValues);
  }
  App.movieTools = { init: init };
})();
