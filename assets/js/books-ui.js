(function () {
  'use strict';
  const App = window.LocalApp, books = App.books, esc = App.utils.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  const columns = [['rating','#',70],['average','Ave',75],['yearRead','Year',90],['title','Name',240],['authors','Author',190],['kind','Type',120],['genres','Genre',180],['ownership','Own',100],['formats','Format',150],['review','Review',260]];
  let group = null, batch = null;
  function state() { return App.storage.getState(); }
  function pref() { return state().ui.books; }
  function preference(patch) { App.storage.mutate(function (s) { Object.assign(s.ui.books, patch); }, { touch: false, reason: 'books-preference' }); }
  function value(b, key) {
    if (key === 'rating') return b.status === 'Want to Read' ? b.priority : b.rating;
    if (key === 'authors') return b.authors.map(function (a) { return a.name; }).join(', ');
    if (key === 'formats') return b.formats.join(', ') + (b.audible ? ' · Audible' : '');
    if (key === 'genres') return b.genres.join(', ');
    if (key === 'average') return b.catalog.average;
    if (key === 'ownership') return b.ownership === 'Owned' ? 'YES' : b.ownership === 'Not owned' ? 'NO' : null;
    return b[key];
  }
  async function refreshAll() {
    if (batch) return;
    const linked = state().workspace.books.filter(function (b) { return !b.deleted && b.catalog.workId; });
    const message = $('#booksBatchStatus');
    if (!linked.length) { message.textContent = 'No linked books to refresh. Link a book to Open Library in its editor first.'; return; }
    if (navigator.onLine === false) { message.textContent = 'You’re offline. Saved books can still be edited.'; return; }
    const controller = new AbortController(); batch = controller;
    $('#booksStop').hidden = false; $('#booksRefresh').disabled = true;
    let updated = 0, skipped = 0, errorMessage = '';
    try {
      const before = App.utils.stableJson(state());
      if (!await App.storage.saveRecoveryAsync('Before refreshing all books')) throw new Error('Could not save recovery. No books were changed.');
      if (App.utils.stableJson(state()) !== before) throw new Error('Books changed while preparing recovery. Refresh again.');
      for (let index = 0; index < linked.length && !controller.signal.aborted; index++) {
        const old = linked[index];
        message.textContent = 'Refreshing linked books · ' + (index + 1) + '/' + linked.length + ': ' + old.title;
        if (App.booksEditor.isEditing(old.id)) { skipped++; continue; }
        const snapshot = App.utils.stableJson(old);
        const result = await App.openLibrary.details(old.catalog, controller.signal, true);
        if (controller.signal.aborted) break;
        const current = state().workspace.books.find(function (b) { return b.id === old.id && !b.deleted; });
        if (!current || snapshot !== App.utils.stableJson(current) || App.booksEditor.isEditing(old.id)) { skipped++; continue; }
        const next = App.utils.clone(state());
        const position = next.workspace.books.findIndex(function (b) { return b.id === old.id; });
        next.workspace.books[position] = books.refresh(current, result.catalog);
        next.workspace.books = books.normalizeList(next.workspace.books);
        App.storage.replace(next, { saveRecovery: false, reason: 'books-refresh' });
        updated++;
      }
    } catch (error) { if (error.name !== 'AbortError') errorMessage = error.message; }
    finally {
      batch = null; $('#booksStop').hidden = true; $('#booksRefresh').disabled = false;
      message.textContent = (controller.signal.aborted ? 'Stopped. ' : '') + updated + ' of ' + linked.length + ' linked books refreshed; ' + skipped + ' skipped. ' + errorMessage;
    }
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
    $('#booksSearchCount').textContent = rows.length + ' / ' + all.length;
    $('#booksEmpty').hidden = rows.length > 0; $('#booksEmpty').textContent = all.length ? 'No books match this view. Try clearing filters.' : 'Add your first book, or search Open Library to find it.';
    const ordered = columns;
    $('#booksTable colgroup').innerHTML = ordered.map(function (c) { return '<col style="width:' + (p.widths[c[0]] || c[2]) + 'px">'; }).join('');
    $('#booksTable').style.width = ordered.reduce(function (n, c) { return n + (p.widths[c[0]] || c[2]); }, 0) + 'px';
    $('#booksTable thead').innerHTML = '<tr>' + ordered.map(function (c) { const detail = c[0] === 'rating' ? 'My rating or wishlist priority' : c[0] === 'average' ? 'Open Library average rating' : c[1]; return '<th scope="col" aria-sort="' + (p.sort === c[0] ? p.direction === 'asc' ? 'ascending' : 'descending' : 'none') + '"><button type="button" data-books-sort="' + c[0] + '" aria-label="Sort by ' + detail + '" title="' + detail + '">' + c[1] + (p.sort === c[0] ? p.direction === 'asc' ? ' ↑' : ' ↓' : '') + '</button><button type="button" class="book-resize" data-book-resize="' + c[0] + '" aria-label="Resize ' + c[1] + ' column" title="Drag or use arrow keys to resize"></button></th>'; }).join('') + '</tr>';
    $('#booksTable tbody').innerHTML = rows.map(function (b) { return '<tr>' + ordered.map(function (c) {
      const v = value(b, c[0]);
      if (c[0] === 'rating') {
        const wishlist = b.status === 'Want to Read', label = wishlist ? 'Wishlist priority (1 highest)' : 'My rating out of 5';
        return '<td title="' + label + '">' + (v === null ? '—' : '<span class="' + (wishlist ? 'movie-priority' : 'movie-score') + '" style="background:' + App.movies.color(v, wishlist) + '">' + v + '</span>') + '</td>';
      }
      if (c[0] === 'yearRead') return '<td><span class="book-year-cell"><span>' + (v === null ? '—' : esc(v)) + '</span>' + (b.notes.trim() ? '<button type="button" class="book-notes-marker" data-book-open="' + esc(b.id) + '" title="Longer notes saved" aria-label="Open longer notes for ' + esc(b.title) + '">' + App.icons.markup('notes') + '</button>' : '') + '</span></td>';
      if (c[0] === 'title') return '<th scope="row"><button type="button" class="book-title" data-book-open="' + esc(b.id) + '">' + esc(b.title) + '</button>' + (b.status !== 'Read' ? '<button type="button" class="book-mark" data-book-read="' + esc(b.id) + '">Mark read</button>' : '') + '</th>';
      if (c[0] === 'average') return '<td title="' + esc(b.catalog.average === null ? 'Not available' : b.catalog.ratingsCount + ' ratings · fetched ' + b.catalog.ratingsFetchedAt.slice(0, 10)) + '">' + (v === null ? '—' : '<a href="https://openlibrary.org/works/' + b.catalog.workId + '" target="_blank" rel="noopener noreferrer">' + v.toFixed(2) + '</a>') + '</td>';
      return '<td title="' + esc(v ?? '') + '">' + esc(v === null || v === '' ? '—' : v) + '</td>';
    }).join('') + '</tr>'; }).join('');
    const pivotCounts = App.booksPivotsUI.render(all, p);
    $('#booksPivotSearchCount').textContent = pivotCounts.shown + ' / ' + pivotCounts.total;
    const tab = $('[data-shelf="books"]'); if (tab) { tab.querySelector('.shelf-tab-count').textContent = all.length; tab.setAttribute('aria-label', 'Books, ' + all.length + ' books'); }
  }
  function init() {
    [['booksFilterStatus',books.statuses],['booksFilterOwnership',books.ownerships],['booksFilterKind',books.kinds],['booksFilterFormat',books.formats.concat('Audible')]].forEach(function (entry) { $('#' + entry[0]).innerHTML = '<option value="all">All</option>' + entry[1].map(function (s) { return '<option value="' + esc(s) + '">' + (entry[0] === 'booksFilterOwnership' ? s === 'Owned' ? 'YES' : s === 'Not owned' ? 'NO' : 'Unknown' : esc(s)) + '</option>'; }).join(''); });
    $('#booksAdd').addEventListener('click', function () { App.booksEditor.open(null, this); });
    $('#booksRefresh').addEventListener('click', refreshAll);
    $('#booksStop').addEventListener('click', function () { batch?.abort(); });
    $('#booksWorkspace').addEventListener('click', function (event) {
      const view = event.target.closest('[data-books-view]'); if (view) { group = null; preference({ view: view.dataset.booksView, status: 'all', sort: view.dataset.booksView === 'wishlist' ? 'rating' : 'title', direction: 'asc' }); }
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
      const table = $('#booksTable'), col = table.querySelector('col:nth-child(' + (columns.findIndex(function (c) { return c[0] === key; }) + 1) + ')');
      const total = parseInt(table.style.width, 10), clamp = function (n) { return Math.max(70, Math.min(800, Math.round(n))); };
      let current = size;
      const show = function (n) { current = clamp(n); col.style.width = current + 'px'; table.style.width = total + current - size + 'px'; };
      const move = function (e) { if (e.pointerId === event.pointerId) show(size + e.clientX - start); };
      const clear = function () { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', finish); document.removeEventListener('pointercancel', cancel); };
      const finish = function (e) {
        if (e.pointerId !== event.pointerId) return;
        clear();
        show(size + e.clientX - start); if (current !== size) width(key, current);
      };
      const cancel = function (e) { if (e.pointerId !== event.pointerId) return; clear(); show(size); };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', finish); document.addEventListener('pointercancel', cancel);
    });
    window.addEventListener('app:statechange', function (event) { if (event.detail.reason === 'edit-document') return; if (['import','sync-download','sync-merge','recovery','erase-all','restore-demo','reset-preferences'].includes(event.detail.reason)) group = null; render(); });
    render();
  }
  App.booksUI = { init: init, render: render };
})();
