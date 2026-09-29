(function () {
  'use strict';
  const App = window.LocalApp, esc = App.utils.escapeHtml;
  const dimensions = [['type', 'Type'], ['genres', 'Genres'], ['networks', 'Networks']];
  const preferences = Object.fromEntries(dimensions.map(function (d) { return [d[0], { search: '', minimum: 1, sort: 'count', direction: 'desc' }]; }));
  let shows = [];
  const columnKeys = ['name', 'count', 'average', 'score'];
  function widths(key) {
    const saved = App.storage.getState().ui.tv.pivotWidths || {};
    return columnKeys.map(function (column, index) { return saved[key + '-' + column] || [140, 38, 48, 48][index]; });
  }
  function applyWidths(card, values) {
    const total = values.reduce(function (a, b) { return a + b; }, 0);
    card.style.setProperty('--pivot-card-width', (total + 8) + 'px');
    card.querySelector('table').style.width = total + 'px';
    card.querySelectorAll('col').forEach(function (col, i) { col.style.width = values[i] + 'px'; });
    card.querySelectorAll('[data-tv-pivot-resize]').forEach(function (handle, i) { handle.setAttribute('aria-valuenow', values[i]); });
  }
  function resize(card, index, width, persist) {
    const key = card.dataset.tvGroup, values = widths(key);
    values[index] = Math.round(Math.max(index === 0 ? 50 : 28, Math.min(1200, width)));
    applyWidths(card, values);
    if (persist) App.storage.mutate(function (state) { state.ui.tv.pivotWidths = Object.assign({}, state.ui.tv.pivotWidths, { [key + '-' + columnKeys[index]]: values[index] }); }, { reason: 'tv-pivot-width', touch: false });
  }
  function fit(card, index) {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    ctx.font = getComputedStyle(card.querySelector('table')).font;
    const values = Array.from(card.querySelectorAll('tr')).map(function (row) { return ctx.measureText(row.children[index]?.textContent || '').width + (index === 0 ? 28 : 20); });
    resize(card, index, Math.max(index === 0 ? 70 : 38, ...values), true);
  }
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
      applyWidths(card, widths(key));
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
        return '<tr><th scope="row">' + (key === 'networks' ? App.tvUI.networkPill(row.name) : esc(row.name)) + '</th><td><span class="pivot-count-bar" style="--share:' + row.count / maximum * 100 + '%">' + row.count + '</span></td><td title="' + row.rated + ' rated shows">' + badge(row.average) + '</td><td>' + badge(row.score) + '</td></tr>';
      }).join('') || '<tr><td colspan="4">No matching groups.</td></tr>';
    });
  }
  function init() {
    const grid = document.querySelector('#tvPivotCards');
    grid.innerHTML = dimensions.map(function (dimension) {
      const key = dimension[0], title = dimension[1];
      return '<section class="pivot-card" id="tv-pivot-' + key + '" data-tv-group="' + key + '" aria-labelledby="tv-pivot-title-' + key + '"><header><h3 id="tv-pivot-title-' + key + '">' + title + '</h3><label>Min<input type="number" min="1" max="2000" value="1" data-tv-group-min aria-label="Minimum shows for ' + title + '"></label><small data-tv-group-count role="status"></small></header><label class="pivot-search"><span class="visually-hidden">Search ' + title + '</span><input type="search" data-tv-group-search placeholder="Search…"></label><div class="pivot-controls">' + [['category', 'Group', 'group'], ['count', 'Count', 'pivotCount'], ['average', 'Average', 'pivotAverage'], ['score', 'Score', 'pivotScore']].map(function (sort) {
        return '<button type="button" class="button pivot-sort" data-tv-group-sort="' + sort[0] + '"><span class="pivot-sort-top"><span class="pivot-sort-icon" aria-hidden="true">' + App.icons.markup(sort[2]) + '</span><span class="pivot-direction" aria-hidden="true"></span></span><span>' + sort[1] + '</span></button>';
      }).join('') + '</div><div class="pivot-table-scroll" tabindex="0" role="region" aria-label="' + title + ' TV pivot table"><table><colgroup><col><col><col><col></colgroup><thead><tr>' + ['Name', '#', 'x̄', '∑'].map(function (label, index) { return '<th scope="col">' + label + '<span class="pivot-resizer" data-tv-pivot-resize="' + index + '" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize ' + title + ' ' + columnKeys[index] + ' column" aria-valuemin="' + (index === 0 ? 50 : 28) + '" aria-valuemax="1200" title="Drag or use arrow keys to resize; double-click or Enter to fit"></span></th>'; }).join('') + '</tr></thead><tbody></tbody></table></div></section>';
    }).join('');
    grid.addEventListener('dblclick', function (event) { const handle = event.target.closest('[data-tv-pivot-resize]'); if (handle) fit(handle.closest('.pivot-card'), Number(handle.dataset.tvPivotResize)); });
    grid.addEventListener('keydown', function (event) {
      const handle = event.target.closest('[data-tv-pivot-resize]'); if (!handle) return;
      const card = handle.closest('.pivot-card'), index = Number(handle.dataset.tvPivotResize);
      if (event.key === 'Enter') { event.preventDefault(); fit(card, index); }
      else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); resize(card, index, widths(card.dataset.tvGroup)[index] + (event.key === 'ArrowRight' ? 12 : -12), true); }
    });
    grid.addEventListener('pointerdown', function (event) {
      const handle = event.target.closest('[data-tv-pivot-resize]'); if (!handle || event.button !== 0) return;
      event.preventDefault();
      const card = handle.closest('.pivot-card'), index = Number(handle.dataset.tvPivotResize), start = event.clientX, width = widths(card.dataset.tvGroup)[index];
      let next = width; handle.setPointerCapture(event.pointerId);
      const move = function (e) { next = width + e.clientX - start; resize(card, index, next, false); };
      const end = function () { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end); resize(card, index, next, true); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    });
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
