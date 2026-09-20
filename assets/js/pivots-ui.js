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
    $("#pivotSummary").innerHTML = '<div><strong>' + result.count + '</strong><span>Watched Movies</span></div><div><strong>' + average(result.average) + '</strong><span>Average Rating / 5</span></div><div><strong>' + result.unknownDates + '</strong><span>Unknown Watch Dates</span></div>';
    $("#pivotEmpty").hidden = result.count > 0;
    $("#pivotGrid").hidden = result.count === 0;
    model.dimensions.forEach(function (dimension) {
      const pref = preferences[dimension.id], all = result.groups[dimension.id], rows = model.rows(all, pref.minimum, pref.sort, pref.direction);
      const section = $('#pivot-' + dimension.id);
      section.querySelectorAll('[data-pivot-sort]').forEach(function (button) {
        const selected = button.dataset.pivotSort === pref.sort;
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('aria-label', dimension.title + ': Sort by ' + (button.dataset.pivotSort === 'category' ? 'group' : button.dataset.pivotSort) + (selected ? ', ' + (pref.direction === 'asc' ? 'ascending' : 'descending') + '. Click to reverse.' : ', descending.'));
        button.querySelector('.pivot-direction').innerHTML = selected ? App.icons.markup(pref.direction === 'asc' ? 'sortUp' : 'sortDown') : '';
      });
      section.querySelectorAll('[data-sort-column]').forEach(function (cell) {
        cell.setAttribute('aria-sort', cell.dataset.sortColumn === pref.sort ? (pref.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      });
      section.querySelector('[data-pivot-count]').textContent = rows.length + '/' + all.length;
      const maximum = all.reduce(function (max, row) { return Math.max(max, row.count); }, 1);
      section.querySelector('tbody').innerHTML = rows.length ? rows.map(function (row) {
        const members = dimension.id === 'collections' && !row.missing ? App.storage.getState().workspace.movies.filter(function (movie) { return !movie.deleted && movie.collections.includes(row.name); }) : [];
        const starred = members.length > 0 && members.every(function (movie) { return (movie.starredCollections || []).includes(row.name); });
        const star = members.length ? '<button type="button" class="collection-star" data-star-collection="' + esc(row.name) + '" aria-pressed="' + starred + '" aria-label="' + (starred ? 'Unstar ' : 'Star ') + esc(row.name) + '" title="Include collection in Other Pivots">' + App.icons.markup('star') + '</button>' : '';
        return '<tr><th scope="row" title="' + esc(row.name) + '">' + star + esc(row.name) + '</th><td><span class="pivot-count-bar" style="--share:' + (row.count / maximum * 100).toFixed(2) + '%">' + row.count + '</span></td><td>' + (row.average === null ? '—' : '<span class="movie-score" style="background:' + App.movies.color(row.average, false) + '">' + average(row.average) + '</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="3">No groups meet this minimum. Lower the count to see more.</td></tr>';
    });
  }
  function init() {
    $("#pivotGrid").innerHTML = model.dimensions.map(function (dimension) {
      preferences[dimension.id] = { minimum: 1, sort: ["ratings", "years"].includes(dimension.id) ? "category" : "count", direction: "desc" };
      return '<section class="pivot-card" id="pivot-' + dimension.id + '" aria-labelledby="pivot-title-' + dimension.id + '"><header><h3 id="pivot-title-' + dimension.id + '">' + dimension.title + '</h3><label' + (dimension.id === 'ratings' ? ' data-shortcut="." data-shortcut-always' : '') + '>Min<input data-pivot-min="' + dimension.id + '" type="number" min="1" max="5000" step="1" value="1" aria-label="Minimum Movies for ' + dimension.title + '"></label><small data-pivot-count role="status"></small>' + (dimension.id === 'years' ? '<label class="pivot-year-basis">Group By<select id="pivotYearBasis" aria-label="Group Years By"><option value="watched">Watched</option><option value="release">Release</option></select></label>' : '') + '</header><div class="pivot-controls">' + ['category', 'count', 'average'].map(function (sort) { return '<button type="button" class="button pivot-sort" data-pivot-sort="' + sort + '" data-pivot-id="' + dimension.id + '"><span class="pivot-sort-top"><span class="pivot-sort-icon" aria-hidden="true">' + App.icons.markup(sort === 'category' ? 'group' : sort === 'count' ? 'pivotCount' : 'pivotAverage') + '</span><span class="pivot-direction" aria-hidden="true"></span></span><span>' + (sort === 'category' ? 'Group' : sort === 'count' ? 'Count' : 'Average') + '</span></button>'; }).join('') + '</div><div class="pivot-table-scroll" tabindex="0" role="region" aria-label="' + dimension.title + ' pivot table"><table><caption class="visually-hidden">' + dimension.title + ' — watched movie counts and average ratings</caption><thead><tr><th scope="col" data-sort-column="category">' + (dimension.id === 'years' ? 'Year' : dimension.id === 'ratings' ? 'Rating' : 'Name') + '</th><th scope="col" data-sort-column="count">Count</th><th scope="col" data-sort-column="average">Average</th></tr></thead><tbody></tbody></table></div></section>';
    }).join('');
    document.querySelectorAll('[data-movie-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        active = button.dataset.movieView === 'pivots';
        $('#movieListView').hidden = active; $('#moviePivotsView').hidden = !active;
        $('#movieToolbar').classList.toggle('showing-pivots', active);
        document.querySelectorAll('[data-list-control]').forEach(function (control) { control.hidden = active; });
        document.querySelectorAll('[data-movie-view]').forEach(function (control) { control.setAttribute('aria-pressed', String(control === button)); });
        render();
      });
    });
    $('#pivotGrid').addEventListener('click', function (event) {
      const star = event.target.closest('[data-star-collection]');
      if (star) {
        const name = star.dataset.starCollection, remove = star.getAttribute('aria-pressed') === 'true';
        App.storage.mutate(function (next) {
          next.workspace.movies.forEach(function (movie) {
            if (movie.deleted || !movie.collections.includes(name)) return;
            movie.starredCollections = (movie.starredCollections || []).filter(function (value) { return value !== name; });
            if (!remove) movie.starredCollections.push(name);
          });
        }, { reason: 'collection-star' });
        const persisted = App.storage.saveNow();
        const target = Array.from(document.querySelectorAll('[data-star-collection]')).find(function (button) { return button.dataset.starCollection === name; });
        target?.focus();
        if (!persisted) App.components.toast('Kept for this session. Export a backup before closing.', { title: 'Storage unavailable', kind: 'warning' });
        return;
      }
      const button = event.target.closest('[data-pivot-sort]'); if (!button) return;
      const pref = preferences[button.dataset.pivotId];
      pref.direction = pref.sort === button.dataset.pivotSort && pref.direction === 'desc' ? 'asc' : 'desc';
      pref.sort = button.dataset.pivotSort; render();
    });
    $('#pivotYearBasis').addEventListener('change', render);
    $('#pivotGrid').addEventListener('change', function (event) {
      const input = event.target;
      if (input.dataset.pivotMin) {
        if (!input.checkValidity() || !input.value) { input.value = preferences[input.dataset.pivotMin].minimum; return; }
        preferences[input.dataset.pivotMin].minimum = Number(input.value);
      }
      render();
    });
    window.addEventListener('app:statechange', render);
  }
  App.pivotsUI = { init: init };
})();
