(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils;
  function key(value) { return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim(); }
  function identity(book) { return key(book.title) + '\n' + book.authors.map(function (a) { return key(a.name); }).sort().join('|'); }
  function rows(input) {
    if (!input || input.format !== 'top-shelf-books-import' || input.version !== 1 || !Array.isArray(input.books) || !input.books.length || input.books.length > App.config.controls.maxBooks) throw new Error('Choose a Books import JSON file with format top-shelf-books-import, version 1, and a nonempty books array.');
    if (new TextEncoder().encode(JSON.stringify(input)).length > App.config.controls.maxImportBytes) throw new Error('The Books import exceeds the 5 MiB limit.');
    const ids = new Set(), identities = new Set(), works = new Set(), isbns = new Set();
    return input.books.map(function (row, index) {
      const prefix = 'Book ' + (index + 1) + ': ';
      if (!row || typeof row.title !== 'string' || !row.title.trim()) throw new Error(prefix + 'enter a title.');
      if (!App.books.statuses.includes(row.status)) throw new Error(prefix + 'choose a valid reading status.');
      let book;
      try {
        const authors = Array.isArray(row.authors) ? row.authors.map(function (a) { return typeof a === 'string' ? a : a?.name || ''; }) : [];
        const derived = 'book-import-' + u.fingerprint(key(row.title) + '\n' + authors.map(key).sort().join('|'));
        book = App.books.normalize(Object.assign({}, row, { id: row.id || derived }));
      } catch (error) { throw new Error(prefix + error.message); }
      const itemKey = identity(book);
      if (ids.has(book.id) || identities.has(itemKey) || book.catalog.workId && works.has(book.catalog.workId) || book.catalog.isbn && isbns.has(book.catalog.isbn)) throw new Error(prefix + 'duplicate book in the file. Resolve duplicates before importing.');
      ids.add(book.id); identities.add(itemKey);
      if (book.catalog.workId) works.add(book.catalog.workId);
      if (book.catalog.isbn) isbns.add(book.catalog.isbn);
      return book;
    });
  }
  function preview(existing, input) {
    const imported = rows(input), ids = new Map(), identities = new Map(), works = new Map(), isbns = new Map();
    existing.forEach(function (book) {
      ids.set(book.id, book);
      if (book.deleted) return;
      identities.set(identity(book), book);
      if (book.catalog.workId) works.set(book.catalog.workId, book);
      if (book.catalog.isbn) isbns.set(book.catalog.isbn, book);
    });
    const entries = imported.map(function (book) {
      const match = ids.get(book.id) || (book.catalog.workId && works.get(book.catalog.workId)) || (book.catalog.isbn && isbns.get(book.catalog.isbn)) || identities.get(identity(book));
      return { book: book, skip: !!match, reason: match ? match.deleted ? 'Previously deleted · skipped' : 'Already in library · kept unchanged' : 'Add' };
    });
    App.books.normalizeList(existing.concat(entries.filter(function (entry) { return !entry.skip; }).map(function (entry) { return entry.book; })));
    return { entries: entries, snapshot: u.stableJson(existing) };
  }
  function apply(existing, input, snapshot, selectedIds) {
    if (u.stableJson(existing) !== snapshot) throw new Error('Books changed since this preview. Preview the file again before importing.');
    const result = preview(existing, input), selected = new Set(selectedIds);
    const added = result.entries.filter(function (entry) { return !entry.skip && selected.has(entry.book.id); }).map(function (entry) { return entry.book; });
    if (!added.length) throw new Error('Select at least one book to add.');
    return { books: App.books.normalizeList(existing.concat(added)), count: added.length };
  }
  App.booksImport = { preview: preview, apply: apply };
})();
