(function () {
  'use strict';
  const App = window.LocalApp, esc = App.utils.escapeHtml;
  const dimensions = [['type', 'Type'], ['genres', 'Genres'], ['networks', 'Networks']];
  const preferences = Object.fromEntries(dimensions.map(function (d) { return [d[0], { search: '', minimum: 1, sort: 'count', direction: 'desc' }]; }));
  let shows = [];
  function groups(key) {
    const buckets = new Map();
    shows.forEach(function (show) {
      const values = key === 'type' ? [show.type] : show[key];
      new Set(values.filter(Boolean)).forEach(function (name) {
        if (!buckets.has(name)) buckets.set(name, { name: name, count: 0, rated: 0, total: 0 });
        const row = buckets.get(name); row.count++;
        if (show.rating !== null) { row.rated++; row.total += show.rating; }
      });
    });
    return Array.from(buckets.values()).map(function (row) {
      row.average = row.rated ? row.total / row.rated : null;
      row.score = App.pivots.score(row.rated, row.average);
      return row;
    });
  }
  function render(items) {
    shows = items;
    dimensions.forEach(function (dimension) {
      const key = dimension[0], card = document.querySelector('#tv-pivot-' + key);
      if (!card) return;
      const pref = preferences[key], all = groups(key);
      const rows = all.filter(function (row) { return row.count >= pref.minimum && row.name.toLowerCase().includes(pref.search); });
      rows.sort(function (a, b) {
        const av = pref.sort === 'category' ? a.name : a[pref.sort], bv = pref.sort === 'category' ? b.name : b[pref.sort];
        if (av === null || bv === null) return av === bv ? a.name.localeCompare(b.name) : av === null ? 1 : -1;
        return (typeof av === 'number' ? av - bv : av.localeCompare(bv)) * (pref.direction === 'asc' ? 1 : -1) || a.name.localeCompare(b.name);
      });
      card.querySelector('[data-tv-group-count]').textContent = rows.length + ' / ' + all.length + ' groups';
      card.querySelectorAll('[data-tv-group-sort]').forEach(function (button) {
        const active = button.dataset.tvGroupSort === pref.sort;
        button.setAttribute('aria-pressed', String(active));
        button.querySelector('.pivot-direction').innerHTML = active ? App.icons.markup(pref.direction === 'asc' ? 'sortUp' : 'sortDown') : '';
      });
      const maximum = Math.max(1, ...rows.map(function (row) { return row.count; }));
      const badge = function (value) { return value === null ? '—' : '<span class="movie-score" style="background:' + App.movies.color(value, false) + '">' + value.toFixed(1) + '</span>'; };
      card.querySelector('tbody').innerHTML = rows.map(function (row) {
        return '<tr><th scope="row">' + esc(row.name) + '</th><td><span class="pivot-count-bar" style="--share:' + row.count / maximum * 100 + '%">' + row.count + '</span></td><td title="' + row.rated + ' rated shows">' + badge(row.average) + '</td><td>' + badge(row.score) + '</td></tr>';
      }).join('') || '<tr><td colspan="4">No matching groups.</td></tr>';
    });
  }
  function init() {
    const grid = document.querySelector('#tvPivotCards');
    grid.innerHTML = dimensions.map(function (dimension) {
      const key = dimension[0], title = dimension[1];
      return '<section class="pivot-card" id="tv-pivot-' + key + '" data-tv-group="' + key + '" aria-labelledby="tv-pivot-title-' + key + '"><header><h3 id="tv-pivot-title-' + key + '">' + title + '</h3><label>Min<input type="number" min="1" max="2000" value="1" data-tv-group-min aria-label="Minimum shows for ' + title + '"></label><small data-tv-group-count role="status"></small></header><label class="pivot-search"><span class="visually-hidden">Search ' + title + '</span><input type="search" data-tv-group-search placeholder="Search…"></label><div class="pivot-controls">' + [['category', 'Group', 'group'], ['count', 'Count', 'pivotCount'], ['average', 'Average', 'pivotAverage'], ['score', 'Score', 'pivotScore']].map(function (sort) {
        return '<button type="button" class="button pivot-sort" data-tv-group-sort="' + sort[0] + '"><span class="pivot-sort-top"><span class="pivot-sort-icon" aria-hidden="true">' + App.icons.markup(sort[2]) + '</span><span class="pivot-direction" aria-hidden="true"></span></span><span>' + sort[1] + '</span></button>';
      }).join('') + '</div><div class="pivot-table-scroll" tabindex="0" role="region" aria-label="' + title + ' TV pivot table"><table><thead><tr><th scope="col">Name</th><th scope="col" title="Show count">#</th><th scope="col" title="Average personal rating">x̄</th><th scope="col" title="Confidence-adjusted score">∑</th></tr></thead><tbody></tbody></table></div></section>';
    }).join('');
    grid.addEventListener('input', function (event) {
      const card = event.target.closest('[data-tv-group]'); if (!card) return;
      const pref = preferences[card.dataset.tvGroup];
      if (event.target.hasAttribute('data-tv-group-search')) pref.search = event.target.value.trim().toLowerCase();
      if (event.target.hasAttribute('data-tv-group-min')) pref.minimum = Math.max(1, Math.min(2000, Number(event.target.value) || 1));
      render(shows);
    });
    grid.addEventListener('click', function (event) {
      const button = event.target.closest('[data-tv-group-sort]'); if (!button) return;
      const pref = preferences[button.closest('[data-tv-group]').dataset.tvGroup], key = button.dataset.tvGroupSort;
      pref.direction = pref.sort === key ? (pref.direction === 'asc' ? 'desc' : 'asc') : key === 'category' ? 'asc' : 'desc'; pref.sort = key;
      render(shows);
    });
  }
  App.tvPivotsUI = { init: init, render: render };
})();
