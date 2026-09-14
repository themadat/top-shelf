(function () {
  "use strict";
  const App = window.LocalApp, model = App.pivots, esc = App.utils.escapeHtml;
  const $ = function (selector) { return document.querySelector(selector); };
  const preferences = {};
  let active = false;
  function average(value) { return value === null ? "—" : value.toFixed(2); }
  function render() {
    if (!active) return;
    const result = model.build(App.storage.getState().workspace.movies, $("#pivotYearBasis").value);
    $("#pivotSummary").innerHTML = '<div><strong>' + result.count + '</strong><span>Watched movies</span></div><div><strong>' + average(result.average) + '</strong><span>Average rating / 5</span></div><div><strong>' + result.unknownDates + '</strong><span>Unknown watch dates</span></div>';
    $("#pivotEmpty").hidden = result.count > 0;
    $("#pivotGrid").hidden = result.count === 0;
    model.dimensions.forEach(function (dimension) {
      const pref = preferences[dimension.id], all = result.groups[dimension.id], rows = model.rows(all, pref.minimum, pref.sort);
      const section = $('#pivot-' + dimension.id);
      section.querySelector('[data-pivot-count]').textContent = rows.length + ' of ' + all.length + ' groups';
      const maximum = all.reduce(function (max, row) { return Math.max(max, row.count); }, 1);
      section.querySelector('tbody').innerHTML = rows.length ? rows.map(function (row) {
        return '<tr><th scope="row">' + esc(row.name) + '</th><td><span class="pivot-count-bar" style="--share:' + (row.count / maximum * 100).toFixed(2) + '%">' + row.count + '</span></td><td>' + (row.average === null ? '—' : '<span class="movie-score" style="background:' + App.movies.color(row.average, false) + '">' + average(row.average) + '</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="3">No groups meet this minimum. Lower the count to see more.</td></tr>';
    });
  }
  function init() {
    $("#pivotGrid").innerHTML = model.dimensions.map(function (dimension) {
      preferences[dimension.id] = { minimum: 1, sort: "count" };
      return '<section class="pivot-card" id="pivot-' + dimension.id + '" aria-labelledby="pivot-title-' + dimension.id + '"><header><h3 id="pivot-title-' + dimension.id + '">' + dimension.title + '</h3><small data-pivot-count role="status"></small></header><div class="pivot-controls"><label>Minimum movies<input data-pivot-min="' + dimension.id + '" type="number" min="1" max="5000" step="1" value="1" aria-label="Minimum movies for ' + dimension.title + '"></label><label>Sort by<select data-pivot-sort="' + dimension.id + '" aria-label="Sort ' + dimension.title + '"><option value="count">Most movies</option><option value="average">Highest average</option><option value="name">' + (['ratings', 'years'].includes(dimension.id) ? 'Lowest first' : 'Name A–Z') + '</option><option value="name-desc">' + (['ratings', 'years'].includes(dimension.id) ? 'Highest first' : 'Name Z–A') + '</option></select></label></div><div class="pivot-table-scroll" tabindex="0" role="region" aria-label="' + dimension.title + ' pivot table"><table><caption class="visually-hidden">' + dimension.title + ' — watched movie counts and average ratings</caption><thead><tr><th scope="col">' + (dimension.id === 'years' ? 'Year' : dimension.id === 'ratings' ? 'Rating' : 'Name') + '</th><th scope="col">Movies</th><th scope="col">Average</th></tr></thead><tbody></tbody></table></div></section>';
    }).join('');
    document.querySelectorAll('[data-movie-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        active = button.dataset.movieView === 'pivots';
        $('#movieListView').hidden = active; $('#moviePivotsView').hidden = !active;
        document.querySelectorAll('[data-movie-view]').forEach(function (control) { control.setAttribute('aria-pressed', String(control === button)); });
        render();
      });
    });
    $('#pivotYearBasis').addEventListener('change', render);
    $('#pivotGrid').addEventListener('change', function (event) {
      const input = event.target;
      if (input.dataset.pivotMin) {
        if (!input.checkValidity() || !input.value) { input.value = preferences[input.dataset.pivotMin].minimum; return; }
        preferences[input.dataset.pivotMin].minimum = Number(input.value);
      }
      if (input.dataset.pivotSort) preferences[input.dataset.pivotSort].sort = input.value;
      render();
    });
    window.addEventListener('app:statechange', render);
  }
  App.pivotsUI = { init: init };
})();
