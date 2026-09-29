(function () {
  'use strict';
  const App = window.LocalApp, books = App.books, esc = App.utils.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  const columns = [['title','Book',240],['authors','Authors',190],['yearRead','Year read',110],['rating','My rating',110],['average','Open Library / 5',145],['priority','Priority',100],['status','Status',130],['ownership','Ownership',120],['formats','Formats',160],['kind','Fiction / nonfiction',140],['genres','Genres',180],['review','Short review',260]];
  let group = null;
  function state() { return App.storage.getState(); }
  function pref() { return state().ui.books; }
  function preference(patch) { App.storage.mutate(function (s) { Object.assign(s.ui.books, patch); }, { touch: false, reason: 'books-preference' }); }
  function value(b, key) {
    if (key === 'authors') return b.authors.map(function (a) { return a.name; }).join(', ');
    if (key === 'formats') return b.formats.join(', ') + (b.audible ? ' · Audible' : '');
    if (key === 'genres') return b.genres.join(', ');
    if (key === 'average') return b.catalog.average;
    return b[key];
  }
  function render() {
    const p = pref(), all = state().workspace.books.filter(function (b) { return !b.deleted; });
    const pivot = p.view === 'pivots'; $('#booksListView').hidden = pivot; $('#booksPivotsView').hidden = !pivot;
    document.querySelectorAll('[data-books-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.booksView === p.view)); });
    [['query','booksSearch'],['status','booksFilterStatus'],['ownership','booksFilterOwnership'],['kind','booksFilterKind'],['format','booksFilterFormat'],['pivotQuery','booksPivotSearch'],['minimum','booksPivotMin'],['pivotSort','booksPivotSort']].forEach(function (entry) { const node = $('#' + entry[1]); if (node !== document.activeElement) node.value = p[entry[0]]; });
    $('#booksPivotDirection').textContent = p.pivotDirection === 'asc' ? 'Ascending ↑' : 'Descending ↓';
    const rows = all.filter(function (b) { return (p.view !== 'read' || b.status === 'Read') && (p.view !== 'wishlist' || b.status === 'Want to Read') && (p.status === 'all' || b.status === p.status) && (p.ownership === 'all' || b.ownership === p.ownership) && (p.kind === 'all' || b.kind === p.kind) && (p.format === 'all' || (p.format === 'Audible' ? b.audible : b.formats.includes(p.format))) && (!p.query || books.searchable(b).includes(p.query.toLowerCase())) && (!group || b.status === 'Read' && books.groups(b, group.type).some(function (g) { return g.key === group.key; })); });
    rows.sort(function (a, b) {
      const x = value(a, p.sort), y = value(b, p.sort);
      if (x === null || y === null) return x === y ? a.title.localeCompare(b.title) : x === null ? 1 : -1;
      const diff = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
      return diff * (p.direction === 'asc' ? 1 : -1) || a.title.localeCompare(b.title);
    });
    $('#booksGroup').hidden = !group; $('#booksGroup').textContent = group ? 'Completed books in ' + group.label + ' · Clear filters to leave this group.' : '';
    $('#booksCount').textContent = rows.length + ' of ' + all.length + ' books' + (p.view === 'wishlist' ? ' · Priority 1 is highest; blank means unprioritized.' : '');
    $('#booksEmpty').hidden = rows.length > 0; $('#booksEmpty').textContent = all.length ? 'No books match this view. Try clearing filters.' : 'Add your first book, or search Open Library to find it.';
    const ordered = p.view === 'wishlist' ? [columns[5]].concat(columns.filter(function (c) { return c[0] !== 'priority'; })) : columns;
    $('#booksTable colgroup').innerHTML = ordered.map(function (c) { return '<col style="width:' + (p.widths[c[0]] || c[2]) + 'px">'; }).join('');
    $('#booksTable').style.width = ordered.reduce(function (n, c) { return n + (p.widths[c[0]] || c[2]); }, 0) + 'px';
    $('#booksTable thead').innerHTML = '<tr>' + ordered.map(function (c) { return '<th scope="col" aria-sort="' + (p.sort === c[0] ? p.direction === 'asc' ? 'ascending' : 'descending' : 'none') + '"><button type="button" data-books-sort="' + c[0] + '">' + c[1] + (p.sort === c[0] ? p.direction === 'asc' ? ' ↑' : ' ↓' : '') + '</button><button type="button" class="book-resize" data-book-resize="' + c[0] + '" aria-label="Resize ' + c[1] + ' column" title="Drag or use arrow keys to resize"></button></th>'; }).join('') + '</tr>';
    $('#booksTable tbody').innerHTML = rows.map(function (b) { return '<tr>' + ordered.map(function (c) {
      const v = value(b, c[0]);
      if (c[0] === 'title') return '<th scope="row"><button type="button" class="book-title" data-book-open="' + b.id + '">' + esc(b.title) + '</button>' + (b.notes ? '<small class="book-hint">Notes saved</small>' : '') + (b.status !== 'Read' ? '<button type="button" class="book-mark" data-book-read="' + b.id + '">Mark read</button>' : '') + '</th>';
      if (c[0] === 'average') return '<td title="' + esc(b.catalog.average === null ? 'Not available' : b.catalog.ratingsCount + ' ratings · fetched ' + b.catalog.ratingsFetchedAt.slice(0, 10)) + '">' + (v === null ? 'Not available' : '<a href="https://openlibrary.org/works/' + b.catalog.workId + '" target="_blank" rel="noopener noreferrer">' + v.toFixed(2) + '</a>') + '</td>';
      return '<td title="' + esc(v ?? '') + '">' + esc(v === null || v === '' ? '—' : v) + '</td>';
    }).join('') + '</tr>'; }).join('');
    App.booksPivotsUI.render(all, p);
    const tab = $('[data-shelf="books"]'); if (tab) { tab.querySelector('.shelf-tab-count').textContent = all.length; tab.setAttribute('aria-label', 'Books, ' + all.length + ' books'); }
  }
  function init() {
    [['booksFilterStatus',books.statuses],['booksFilterOwnership',books.ownerships],['booksFilterKind',books.kinds],['booksFilterFormat',books.formats.concat('Audible')]].forEach(function (entry) { $('#' + entry[0]).innerHTML = '<option value="all">All</option>' + entry[1].map(function (s) { return '<option>' + esc(s) + '</option>'; }).join(''); });
    $('#booksAdd').addEventListener('click', function () { App.booksEditor.open(null, this); });
    $('#booksWorkspace').addEventListener('click', function (event) {
      const view = event.target.closest('[data-books-view]'); if (view) { group = null; preference({ view: view.dataset.booksView, status: 'all', sort: view.dataset.booksView === 'wishlist' ? 'priority' : 'title', direction: 'asc' }); }
      const sort = event.target.closest('[data-books-sort]'); if (sort) preference({ sort: sort.dataset.booksSort, direction: pref().sort === sort.dataset.booksSort && pref().direction === 'asc' ? 'desc' : 'asc' });
      const open = event.target.closest('[data-book-open]'); if (open) App.booksEditor.open(open.dataset.bookOpen, open);
      const read = event.target.closest('[data-book-read]'); if (read) App.booksEditor.open(read.dataset.bookRead, read, true);
      const g = event.target.closest('[data-book-group]'); if (g) { group = { type: g.dataset.bookGroup, key: g.dataset.groupKey, label: g.dataset.groupLabel }; preference({ view: 'read', query: '', status: 'all', ownership: 'all', kind: 'all', format: 'all' }); $('#booksSearch').focus(); }
    });
    [['query','booksSearch','input'],['status','booksFilterStatus','change'],['ownership','booksFilterOwnership','change'],['format','booksFilterFormat','change'],['kind','booksFilterKind','change'],['pivotQuery','booksPivotSearch','input'],['pivotSort','booksPivotSort','change']].forEach(function (entry) { $('#' + entry[1]).addEventListener(entry[2], function () { preference({ [entry[0]]: this.value }); }); });
    $('#booksPivotMin').addEventListener('change', function () { if (this.checkValidity()) preference({ minimum: Number(this.value) }); else this.reportValidity(); });
    $('#booksPivotDirection').addEventListener('click', function () { preference({ pivotDirection: pref().pivotDirection === 'asc' ? 'desc' : 'asc' }); });
    $('#booksClear').addEventListener('click', function () { group = null; preference({ query: '', status: 'all', ownership: 'all', kind: 'all', format: 'all' }); });
    function width(key, size) { preference({ widths: Object.assign({}, pref().widths, { [key]: Math.max(70, Math.min(800, Math.round(size))) }) }); }
    $('#booksTable').addEventListener('keydown', function (event) { const b = event.target.closest('[data-book-resize]'); if (b && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); const key = b.dataset.bookResize; width(key, (pref().widths[key] || columns.find(function (c) { return c[0] === key; })[2]) + (event.key === 'ArrowRight' ? 20 : -20)); $('[data-book-resize="' + key + '"]').focus(); } });
    $('#booksTable').addEventListener('pointerdown', function (event) {
      const b = event.target.closest('[data-book-resize]'); if (!b) return; event.preventDefault();
      const key = b.dataset.bookResize, start = event.clientX, size = pref().widths[key] || columns.find(function (c) { return c[0] === key; })[2];
      const end = function (e) { document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', cancel); width(key, size + e.clientX - start); };
      const cancel = function () { document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', cancel); };
      document.addEventListener('pointerup', end); document.addEventListener('pointercancel', cancel, { once: true });
    });
    window.addEventListener('app:statechange', function (event) { if (event.detail.reason === 'edit-document') return; if (['import','sync-download','sync-merge','recovery','erase-all','restore-demo','reset-preferences'].includes(event.detail.reason)) group = null; render(); });
    render();
  }
  App.booksUI = { init: init, render: render };
})();
