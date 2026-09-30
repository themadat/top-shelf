(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils;
  function key(value) { return value.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim(); }
  function identity(book) { return key(book.title) + '\n' + book.authors.map(function (a) { return key(a.name); }).sort().join('|'); }
  function matchCatalog(book, candidates, usedWorkIds) {
    const title = key(book.title).replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
    const names = book.authors.map(function (a) { return key(a.name).replace(/[^\p{L}\p{N}]/gu, ''); });
    const matches = candidates.filter(function (candidate) {
      if (!candidate.workId || usedWorkIds.has(candidate.workId)) return false;
      const candidateTitle = key(candidate.title).replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
      if (candidateTitle !== title || !names.length) return false;
      return candidate.authors.some(function (author) {
        const other = key(author.name).replace(/[^\p{L}\p{N}]/gu, '');
        return names.some(function (name) { return name === other; });
      });
    });
    return matches.length === 1 ? matches[0] : null;
  }
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
      const byId = ids.get(book.id), byIdentity = identities.get(identity(book));
      const match = byId || byIdentity || (book.catalog.workId && works.get(book.catalog.workId)) || (book.catalog.isbn && isbns.get(book.catalog.isbn));
      const sameBook = match && !match.deleted && (byIdentity === match || byId === match && key(book.title) === key(match.title));
      const claimedWork = book.catalog.workId && works.get(book.catalog.workId);
      let action = 'add', reason = 'Add';
      if (match?.deleted) { action = 'skip'; reason = 'Previously deleted · skipped'; }
      else if (match && (!sameBook || claimedWork && claimedWork !== match)) { action = 'skip'; reason = 'Catalog or ID belongs to another book · skipped'; }
      else if (match?.catalog?.workId) { action = 'skip'; reason = 'Already linked · kept unchanged'; }
      else if (match) { action = book.catalog.workId ? 'link' : 'lookup'; reason = book.catalog.workId ? 'Link existing book' : 'Existing book · find an ID'; }
      return { book: book, saved: sameBook ? match : null, matchId: match?.id || '', action: action, skip: action === 'skip', reason: reason };
    });
    const proposed = existing.map(function (book) {
      const entry = entries.find(function (item) { return item.action === 'link' && item.matchId === book.id; });
      return entry ? withCatalog(book, entry.book.catalog) : book;
    }).concat(entries.filter(function (entry) { return entry.action === 'add'; }).map(function (entry) { return entry.book; }));
    App.books.normalizeList(proposed);
    return { entries: entries, snapshot: u.stableJson(existing) };
  }
  function withCatalog(book, incoming) {
    const merged = Object.assign({}, book.catalog);
    Object.entries(incoming).forEach(function (pair) {
      const value = pair[1];
      if (value !== '' && value !== null && value !== 'Unknown' && (!Array.isArray(value) || value.length)) merged[pair[0]] = value;
    });
    return App.books.normalize(Object.assign({}, book, { catalog: merged }));
  }
  function apply(existing, input, snapshot, selectedIds) {
    if (u.stableJson(existing) !== snapshot) throw new Error('Books changed since this preview. Preview the file again before importing.');
    const result = preview(existing, input), selected = new Set(selectedIds);
    const added = result.entries.filter(function (entry) { return entry.action === 'add' && selected.has(entry.book.id); }).map(function (entry) { return entry.book; });
    const links = result.entries.filter(function (entry) { return entry.action === 'link' && selected.has(entry.book.id); });
    if (!added.length && !links.length) throw new Error('Select at least one book to add or link.');
    const updated = existing.map(function (book) {
      const entry = links.find(function (item) { return item.matchId === book.id; });
      return entry ? withCatalog(book, entry.book.catalog) : book;
    });
    return { books: App.books.normalizeList(updated.concat(added)), added: added.length, linked: links.length };
  }
  App.booksImport = { preview: preview, apply: apply, matchCatalog: matchCatalog };
})();
