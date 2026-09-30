(function () {
  'use strict';
  const App = window.LocalApp, esc = App.utils.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  let input = null, preview = null, generation = 0, busy = false, lookupController = null;
  const results = new Map();
  function state() { return App.storage.getState(); }
  function selected() { return Array.from($('#booksImportRows').querySelectorAll('input:checked')).map(function (el) { return el.value; }); }
  function rowFor(id) { return input.books[preview.entries.findIndex(function (entry) { return entry.book.id === id; })]; }
  function usedWorks(except) { return new Set(state().workspace.books.concat(input.books.filter(function (book, index) { return preview.entries[index].book.id !== except; })).map(function (book) { return book.catalog?.workId; }).filter(Boolean)); }
  function counts() {
    const count = selected().length;
    const chosen = new Set(selected());
    $('#booksImportApply').disabled = busy || !count;
    const unlinked = preview.entries.filter(function (e) { return chosen.has(e.book.id) && !e.skip && !e.book.catalog.workId; }).length;
    $('#booksImportFind').disabled = busy || !unlinked;
    $('#booksImportStop').hidden = !lookupController;
    $('#booksImportSummary').textContent = count + ' books selected to add · ' + unlinked + ' selected without an Open Library ID · ' + preview.entries.filter(function (e) { return e.skip; }).length + ' existing/deleted books skipped. Existing entries stay unchanged.';
  }
  function render(checked) {
    $('#booksImportRows').innerHTML = preview.entries.map(function (entry) {
      const book = entry.book, candidates = results.get(book.id) || [];
      let link = 'Not linked';
      if (book.catalog.workId) {
        const url = 'https://openlibrary.org/works/' + book.catalog.workId;
        link = '<a href="' + url + '" target="_blank" rel="noopener noreferrer" title="' + url + '">' + esc(book.catalog.workId) + '</a>';
      } else if (!entry.skip && results.has(book.id)) {
        link = '<select class="books-import-match" data-book-id="' + esc(book.id) + '" aria-label="Open Library match for ' + esc(book.title) + '"><option value="">Choose a match or leave unlinked</option>' + candidates.map(function (candidate, index) { return '<option value="' + index + '">' + esc(candidate.title + ' — ' + candidate.authors.map(function (a) { return a.name; }).join(', ') + ' (' + candidate.workId + ')') + '</option>'; }).join('') + '</select>' + (candidates.length ? '' : '<span>No results</span>');
      }
      return '<tr><td><input type="checkbox" value="' + esc(book.id) + '" aria-label="Import ' + esc(book.title) + '"' + (entry.skip ? ' disabled' : checked ? checked.has(book.id) ? ' checked' : '' : ' checked') + '></td><td>' + esc(book.title) + '</td><td>' + esc(book.authors.map(function (a) { return a.name; }).join(', ') || 'Unknown') + '</td><td>' + esc(book.status) + '</td><td>' + (book.rating === null ? 'Unrated' : book.rating) + '</td><td>' + esc(book.kind) + '</td><td>' + esc(book.review) + '</td><td>' + link + '</td><td>' + entry.reason + '</td></tr>';
    }).join('');
    counts();
  }
  async function read(file) {
    const sequence = ++generation; lookupController?.abort(); lookupController = null; busy = false; input = null; preview = null; results.clear();
    $('#booksImportApply').disabled = true; $('#booksImportFind').disabled = true; $('#booksImportRows').replaceChildren(); $('#booksImportSummary').textContent = ''; $('#booksImportProgress').textContent = ''; $('#booksImportError').textContent = ''; $('#booksImportAudit').hidden = true;
    if (!file) return;
    try {
      if (file.size > App.config.controls.maxImportBytes) throw new Error('Choose a Books import file smaller than 5 MiB.');
      const source = await file.text(); if (sequence !== generation) return;
      let parsed; try { parsed = JSON.parse(source); } catch (error) { throw new Error('This file is not valid JSON.'); }
      const result = App.booksImport.preview(state().workspace.books, parsed); input = parsed; preview = result;
      const audit = Array.isArray(parsed.audit) ? parsed.audit.slice(0, 100) : [];
      $('#booksImportAudit').hidden = !audit.length;
      $('#booksImportAudit').querySelector('summary').textContent = 'Source notes · ' + (Array.isArray(parsed.audit) ? parsed.audit.length : 0);
      $('#booksImportAuditItems').innerHTML = audit.map(function (item) { item = App.utils.plainObject(item); return '<li>' + esc([item.sourceLine ? 'Row ' + item.sourceLine : '', item.title, item.issue].filter(Boolean).join(' · ')) + '</li>'; }).join('');
      render();
    } catch (error) { $('#booksImportError').textContent = error.message; }
  }
  async function find() {
    if (busy || !preview) return;
    const ids = selected(), sequence = generation, checked = new Set(ids), snapshot = preview.snapshot;
    const pending = preview.entries.filter(function (entry) { return ids.includes(entry.book.id) && !entry.skip && !entry.book.catalog.workId; });
    if (!pending.length) return;
    busy = true; lookupController = new AbortController(); counts(); $('#booksImportError').textContent = '';
    let done = 0, linked = 0;
    try {
      for (const entry of pending) {
        if (lookupController.signal.aborted || sequence !== generation) break;
        if (App.utils.stableJson(state().workspace.books) !== snapshot) throw new Error('Books changed during lookup. Preview the file again.');
        $('#booksImportProgress').textContent = 'Looking up ' + (done + 1) + ' of ' + pending.length + ': ' + entry.book.title;
        const candidates = await App.openLibrary.search(entry.book.title, 'title', lookupController.signal);
        if (sequence !== generation) return;
        if (App.utils.stableJson(state().workspace.books) !== snapshot) throw new Error('Books changed during lookup. Preview the file again.');
        results.set(entry.book.id, candidates);
        const match = App.booksImport.matchCatalog(entry.book, candidates, usedWorks(entry.book.id));
        if (match) {
          rowFor(entry.book.id).catalog = match;
          preview = App.booksImport.preview(state().workspace.books, input); linked++;
        }
        done++; render(checked);
      }
      if (sequence === generation) $('#booksImportProgress').textContent = 'Looked up ' + done + ' books; linked ' + linked + ' exact title and author matches. Review remaining candidates before import.';
    } catch (error) {
      if (sequence === generation && !lookupController.signal.aborted) $('#booksImportError').textContent = error.message + ' Completed matches remain in this preview.';
    } finally { if (sequence === generation) { lookupController = null; busy = false; counts(); } }
  }
  function choose(select) {
    if (busy || !preview || !select.value) return;
    if (App.utils.stableJson(state().workspace.books) !== preview.snapshot) { $('#booksImportError').textContent = 'Books changed during lookup. Preview the file again.'; select.value = ''; return; }
    const id = select.dataset.bookId, candidate = results.get(id)?.[Number(select.value)];
    if (!candidate) return;
    if (usedWorks(id).has(candidate.workId)) { $('#booksImportError').textContent = 'That Open Library work is already linked to another book.'; select.value = ''; return; }
    const checked = new Set(selected()), row = rowFor(id);
    row.catalog = candidate;
    try { preview = App.booksImport.preview(state().workspace.books, input); $('#booksImportError').textContent = ''; render(checked); }
    catch (error) { row.catalog = {}; $('#booksImportError').textContent = error.message; select.value = ''; }
  }
  async function apply() {
    if (busy || !preview || !input) return;
    busy = true; $('#booksImportApply').disabled = true; $('#booksImportError').textContent = '';
    const sequence = generation;
    try {
      const before = App.utils.stableJson(state());
      const result = App.booksImport.apply(state().workspace.books, input, preview.snapshot, selected());
      if (!App.storage.saveNow()) throw new Error('Could not save current data before import. Nothing was added.');
      const saved = localStorage.getItem(App.config.storage.stateKey);
      if (saved !== JSON.stringify(state())) throw new Error('Saved data changed in another tab. Nothing was added; reload and preview the file again.');
      if (!await App.storage.saveRecoveryAsync('Before importing books')) throw new Error('Could not save recovery. Nothing was added.');
      if (sequence !== generation) return;
      if (App.utils.stableJson(state()) !== before || localStorage.getItem(App.config.storage.stateKey) !== saved) throw new Error('Data changed while preparing the import. Nothing was added; preview the file again.');
      const next = App.utils.clone(state()); next.workspace.books = result.books;
      App.storage.replace(next, { saveRecovery: false, reason: 'import' });
      App.components.closeDialog('#booksImportDialog');
      App.components.toast('Added ' + result.count + ' books. Existing entries were kept.', { title: 'Books import complete', kind: 'success' });
    } catch (error) { $('#booksImportError').textContent = error.message; }
    finally { busy = false; if (preview) counts(); }
  }
  function init() {
    $('#booksImportButton').addEventListener('click', function () {
      generation++; lookupController?.abort(); lookupController = null; busy = false; input = null; preview = null; results.clear();
      $('#booksImportFile').value = ''; $('#booksImportRows').replaceChildren(); $('#booksImportSummary').textContent = ''; $('#booksImportProgress').textContent = ''; $('#booksImportError').textContent = ''; $('#booksImportAudit').hidden = true; $('#booksImportApply').disabled = true; $('#booksImportFind').disabled = true; $('#booksImportStop').hidden = true;
      App.components.openDialog('#booksImportDialog', { trigger: this, focus: '#booksImportFile' });
    });
    $('#booksImportFile').addEventListener('change', function () { read(this.files[0]); });
    $('#booksImportRows').addEventListener('change', function (event) { if (event.target.matches('.books-import-match')) choose(event.target); else counts(); });
    $('#booksImportFind').addEventListener('click', find);
    $('#booksImportStop').addEventListener('click', function () { lookupController?.abort(); });
    $('#booksImportApply').addEventListener('click', apply);
    $('#booksImportDialog').addEventListener('close', function () { generation++; lookupController?.abort(); lookupController = null; busy = false; input = null; preview = null; results.clear(); });
  }
  App.booksImportUI = { init: init };
})();
