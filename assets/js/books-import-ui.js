(function () {
  'use strict';
  const App = window.LocalApp, esc = App.utils.escapeHtml;
  const $ = function (s) { return document.querySelector(s); };
  let input = null, preview = null, generation = 0, busy = false;
  function state() { return App.storage.getState(); }
  function selected() { return Array.from($('#booksImportRows').querySelectorAll('input:checked')).map(function (el) { return el.value; }); }
  function counts() {
    const count = selected().length;
    $('#booksImportApply').disabled = busy || !count;
    $('#booksImportSummary').textContent = count + ' books selected to add · ' + preview.entries.filter(function (e) { return e.skip; }).length + ' existing/deleted books skipped. Existing entries stay unchanged.';
  }
  async function read(file) {
    const sequence = ++generation; input = null; preview = null;
    $('#booksImportApply').disabled = true; $('#booksImportRows').replaceChildren(); $('#booksImportSummary').textContent = ''; $('#booksImportError').textContent = ''; $('#booksImportAudit').hidden = true;
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
      $('#booksImportRows').innerHTML = result.entries.map(function (entry) {
        const book = entry.book;
        return '<tr><td><input type="checkbox" value="' + esc(book.id) + '" aria-label="Import ' + esc(book.title) + '"' + (entry.skip ? ' disabled' : ' checked') + '></td><td>' + esc(book.title) + '</td><td>' + esc(book.authors.map(function (a) { return a.name; }).join(', ') || 'Unknown') + '</td><td>' + esc(book.status) + '</td><td>' + (book.rating === null ? 'Unrated' : book.rating) + '</td><td>' + esc(book.kind) + '</td><td>' + esc(book.review) + '</td><td>' + entry.reason + '</td></tr>';
      }).join('');
      counts();
    } catch (error) { $('#booksImportError').textContent = error.message; }
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
      generation++; input = null; preview = null;
      $('#booksImportFile').value = ''; $('#booksImportRows').replaceChildren(); $('#booksImportSummary').textContent = ''; $('#booksImportError').textContent = ''; $('#booksImportAudit').hidden = true; $('#booksImportApply').disabled = true;
      App.components.openDialog('#booksImportDialog', { trigger: this, focus: '#booksImportFile' });
    });
    $('#booksImportFile').addEventListener('change', function () { read(this.files[0]); });
    $('#booksImportRows').addEventListener('change', counts);
    $('#booksImportApply').addEventListener('click', apply);
    $('#booksImportDialog').addEventListener('close', function () { generation++; input = null; preview = null; });
  }
  App.booksImportUI = { init: init };
})();
