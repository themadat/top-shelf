(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils, books = App.books, esc = u.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  let draft, baseline, initial, existing, controller, generation = 0, epoch = 0, openedEpoch = 0, results = [], busy = false;
  function state() { return App.storage.getState(); }
  function current() { return state().workspace.books.find(function (b) { return b.id === draft?.id; }); }
  function status(message) { $('#bookEditorStatus').textContent = message; }
  function stop() { generation++; controller?.abort(); controller = null; $('#bookLookupCancel').hidden = true; }
  function read() {
    if (!draft) return;
    draft.title = $('#bookName').value;
    const usedAuthors = new Set();
    draft.authors = $('#bookAuthors').value.split('\n').map(function (name) { name = name.trim(); const old = draft.authors.find(function (a) { return a.name === name && !usedAuthors.has(a); }); if (old) usedAuthors.add(old); return { name: name, id: old?.id || '' }; }).filter(function (a) { return a.name; });
    draft.genres = $('#bookGenres').value.split(',').map(function (g) { return g.trim(); }).filter(Boolean);
    [['status','bookStatus'],['ownership','bookOwnership'],['kind','bookKind'],['review','bookReview'],['notes','bookNotes']].forEach(function (entry) { draft[entry[0]] = $('#' + entry[1]).value; });
    [['yearRead','bookYear'],['rating','bookRating'],['priority','bookPriority']].forEach(function (entry) { const value = $('#' + entry[1]).value; draft[entry[0]] = value === '' ? null : Number(value); });
    draft.formats = [['Print','bookPrint'],['Ebook','bookEbook'],['Audiobook','bookAudio']].filter(function (entry) { return $('#' + entry[1]).checked; }).map(function (entry) { return entry[0]; });
    draft.audible = $('#bookAudible').checked;
  }
  function metadata() {
    const c = draft.catalog;
    $('#bookRefresh').hidden = $('#bookUnlink').hidden = !c.workId;
    $('#bookMetadata').innerHTML = c.workId ? (c.coverId ? '<img class="book-cover" src="https://covers.openlibrary.org/b/id/' + c.coverId + '-M.jpg?default=false" alt="Cover of ' + esc(draft.title) + '" loading="lazy">' : '') + '<p><a href="https://openlibrary.org/works/' + c.workId + '" target="_blank" rel="noopener noreferrer">Open Library</a>' + (c.editionId ? ' · <a href="https://openlibrary.org/books/' + c.editionId + '" target="_blank" rel="noopener noreferrer">Selected edition</a>' : '') + '</p><p>Community rating: <strong>' + (c.average === null ? 'Not available' : c.average.toFixed(2) + ' / 5') + '</strong>' + (c.ratingsCount === null ? '' : ' · ' + c.ratingsCount + ' ratings') + '</p><p class="setting-note">' + esc([c.publicationYear ? 'First published ' + c.publicationYear : '', c.isbn ? 'ISBN ' + c.isbn : '', c.ratingsFetchedAt ? 'Rating fetched ' + c.ratingsFetchedAt.slice(0, 10) : '', c.fetchedAt ? 'Metadata fetched ' + c.fetchedAt.slice(0, 10) : ''].filter(Boolean).join(' · ')) + '</p>' : '<p class="setting-note">Manual entry · Community rating: Not available. Link a catalog match to add source information.</p>';
    const image = $('#bookMetadata img'); if (image) image.addEventListener('error', function () { image.hidden = true; });
  }
  function render() {
    [['title','bookName'],['yearRead','bookYear'],['rating','bookRating'],['priority','bookPriority'],['status','bookStatus'],['ownership','bookOwnership'],['kind','bookKind'],['review','bookReview'],['notes','bookNotes']].forEach(function (entry) { $('#' + entry[1]).value = draft[entry[0]] ?? ''; });
    $('#bookAuthors').value = draft.authors.map(function (a) { return a.name; }).join('\n'); $('#bookGenres').value = draft.genres.join(', ');
    [['Print','bookPrint'],['Ebook','bookEbook'],['Audiobook','bookAudio']].forEach(function (entry) { $('#' + entry[1]).checked = draft.formats.includes(entry[0]); });
    $('#bookAudible').checked = draft.audible;
    metadata();
  }
  function open(id, trigger, markRead) {
    stop(); const saved = state().workspace.books.find(function (b) { return b.id === id && !b.deleted; });
    if (id && !saved) return;
    existing = !!saved; baseline = saved ? u.stableJson(saved) : ''; openedEpoch = epoch;
    draft = saved ? u.clone(saved) : books.normalize({ title: 'New book' });
    if (!saved) { draft.title = ''; draft.status = state().ui.books.view === 'read' ? 'Read' : 'Want to Read'; }
    initial = u.stableJson(draft); if (markRead) draft.status = 'Read';
    $('#bookDialogTitle').textContent = saved ? 'Edit Book' : 'Add Book';
    $('#bookDelete').hidden = !saved; $('#bookLookup').open = !saved; $('#bookLookupQuery').value = ''; $('#bookLookupResults').replaceChildren(); results = [];
    render(); status(markRead ? 'Add a year read, rating or review if you like.' : '');
    App.components.openDialog('#bookDialog', { trigger: trigger, focus: saved ? '#bookName' : '#bookLookupQuery' });
    $('#bookForm').scrollTop = 0;
  }
  function guard() {
    if (epoch !== openedEpoch || (existing ? u.stableJson(current()) !== baseline : current())) throw new Error('Saved data changed while you were editing. Your draft is still here; copy any notes you need, then reopen the book.');
  }
  async function close() {
    if (busy) return;
    read(); stop();
    if (u.stableJson(draft) !== initial && !await App.components.confirm({ title: 'Discard book changes?', message: 'Your unsaved book changes will be discarded.', confirmLabel: 'Discard', cancelLabel: 'Keep editing' })) return;
    App.components.closeDialog('#bookDialog');
  }
  function save(event) {
    event.preventDefault(); if (busy) return;
    try {
      read(); guard(); const book = books.normalize(draft), next = u.clone(state());
      next.workspace.books = books.normalizeList(existing ? next.workspace.books.map(function (b) { return b.id === book.id ? book : b; }) : next.workspace.books.concat(book));
      App.storage.replace(next, { saveRecovery: false, reason: 'books-save' });
      stop(); App.components.closeDialog('#bookDialog');
      App.components.toast('Book saved on this device.', { title: 'Books', kind: 'success' });
    } catch (error) { status(error.message); }
  }
  async function remove() {
    if (busy) return;
    if (!await App.components.confirm({ title: 'Delete this book?', message: 'A recovery copy will be saved before removing this book from your library.', confirmLabel: 'Delete', danger: true })) return;
    busy = true; stop();
    try {
      guard(); const before = u.stableJson(state());
      if (!await App.storage.saveRecoveryAsync('Before deleting a book')) throw new Error('Could not save recovery. The book was kept.');
      guard(); if (u.stableJson(state()) !== before) throw new Error('Data changed while preparing recovery. Nothing was deleted.');
      const next = u.clone(state()); next.workspace.books = next.workspace.books.map(function (b) { return b.id === draft.id ? { id: b.id, deleted: true } : b; });
      App.storage.replace(next, { saveRecovery: false, reason: 'books-delete' });
      App.components.closeDialog('#bookDialog');
    } catch (error) { status(error.message); } finally { busy = false; }
  }
  async function lookup() {
    stop(); const token = generation, signal = (controller = new AbortController()).signal;
    $('#bookLookupCancel').hidden = false; $('#bookLookupResults').replaceChildren(); status('Searching Open Library…');
    try {
      results = await App.openLibrary.search($('#bookLookupQuery').value, $('#bookLookupMode').value, signal);
      if (token !== generation) return;
      $('#bookLookupResults').innerHTML = results.map(function (c, i) { return '<button class="book-match" type="button" data-book-match="' + i + '"><strong>' + esc(c.title) + '</strong><span>' + esc(c.authors.map(function (a) { return a.name; }).join(', ') || 'Unknown author') + (c.publicationYear ? ' · ' + c.publicationYear : '') + '</span></button>'; }).join('');
      status(results.length ? 'Choose a matching book.' : 'No matches. Try another search or enter the book manually.');
    } catch (error) { if (token === generation) status(error.message); }
    finally { if (token === generation) $('#bookLookupCancel').hidden = true; }
  }
  async function link(candidate, refresh) {
    stop(); read(); const token = generation, snapshot = u.stableJson(draft), signal = (controller = new AbortController()).signal;
    $('#bookLookupCancel').hidden = false; status('Getting book information…');
    try {
      guard(); const result = await App.openLibrary.details(candidate, signal, refresh);
      if (token !== generation || !$('#bookDialog').open) return;
      read(); guard(); if (snapshot !== u.stableJson(draft)) throw new Error('Your draft changed during lookup. Search or refresh again to apply metadata.');
      const next = books.refresh(draft, result.catalog);
      books.normalizeList(state().workspace.books.filter(function (b) { return b.id !== draft.id; }).concat(next));
      const changes = ['title','authors','genres','kind'].filter(function (key) { return u.stableJson(draft[key]) !== u.stableJson(next[key]); });
      if (refresh && changes.length && !await App.components.confirm({ title: 'Update book information?', message: changes.map(function (key) { const value = key === 'authors' ? next.authors.map(function (a) { return a.name; }).join(', ') : Array.isArray(next[key]) ? next[key].join(', ') : next[key]; return key + ': ' + (value || 'Unknown'); }).join('\n'), confirmLabel: 'Use updates', cancelLabel: 'Keep draft' })) return;
      if (token !== generation || !$('#bookDialog').open) return;
      read(); guard(); if (snapshot !== u.stableJson(draft)) throw new Error('Your draft changed. Retry this lookup.');
      draft = next; render(); status((refresh ? 'Information refreshed in your draft. ' : 'Catalog match linked in your draft. ') + result.warning + ' Save Book to keep changes.');
    } catch (error) { if (token === generation) status(error.message); }
    finally { if (token === generation) $('#bookLookupCancel').hidden = true; }
  }
  function init() {
    [['bookStatus',books.statuses],['bookOwnership',books.ownerships],['bookKind',books.kinds]].forEach(function (entry) { $('#' + entry[0]).innerHTML = entry[1].map(function (value) { return '<option value="' + esc(value) + '">' + (entry[0] === 'bookOwnership' ? value === 'Owned' ? 'YES' : value === 'Not owned' ? 'NO' : 'Unknown' : esc(value)) + '</option>'; }).join(''); });
    $('#bookForm').addEventListener('submit', save);
    ['bookClose','bookCancel'].forEach(function (id) { $('#' + id).addEventListener('click', close); });
    $('#bookDelete').addEventListener('click', remove); $('#bookLookupSearch').addEventListener('click', lookup);
    $('#bookLookupCancel').addEventListener('click', function () { stop(); status('Lookup stopped. Your draft is kept.'); });
    $('#bookLookupQuery').addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); lookup(); } });
    ['bookLookupQuery','bookLookupMode'].forEach(function (id) { $('#' + id).addEventListener('input', function () { stop(); $('#bookLookupResults').replaceChildren(); results = []; }); });
    $('#bookLookupResults').addEventListener('click', function (event) { const button = event.target.closest('[data-book-match]'); if (button) link(results[Number(button.dataset.bookMatch)], false); });
    $('#bookRefresh').addEventListener('click', function () { link(draft.catalog, true); });
    $('#bookUnlink').addEventListener('click', function () { stop(); read(); draft.catalog = books.catalog(); metadata(); status('Catalog unlinked in your draft. Save Book to keep this change.'); });
    $('#bookAudible').addEventListener('change', function () { if (this.checked) $('#bookAudio').checked = true; });
    $('#bookAudio').addEventListener('change', function () { if (!this.checked) $('#bookAudible').checked = false; });
    $('#bookDialog').addEventListener('cancel', function (event) { event.preventDefault(); close(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && $('#bookDialog').open && !document.querySelector('#confirmDialog[open]')) { event.preventDefault(); event.stopImmediatePropagation(); close(); } }, true);
    $('#bookDialog').addEventListener('close', function () { stop(); draft = null; });
    window.addEventListener('app:statechange', function (event) { if (['import','sync-download','sync-merge','recovery','erase-all','restore-demo'].includes(event.detail.reason)) { epoch++; if (draft) { stop(); status('Saved data was replaced. Copy unsaved notes before reopening this book.'); } } });
  }
  App.booksEditor = { init: init, open: open, isEditing: function (id) { return !!draft && existing && draft.id === id && $('#bookDialog').open; } };
})();
