(function () {
  'use strict';
  const App = window.LocalApp, u = App.utils;
  const statuses = ['Want to Read', 'Reading', 'Read', 'Stopped'];
  const ownerships = ['Unknown', 'Owned', 'Not owned'];
  const kinds = ['Unknown', 'Fiction', 'Nonfiction'];
  const formats = ['Print', 'Ebook', 'Audiobook'];
  function text(value, max, multiline) {
    if (value !== undefined && value !== null && typeof value !== 'string') throw new Error('Book text must be text.');
    if ((value || '').length > max) throw new Error('Book text exceeds its ' + max + ' character limit.');
    return multiline ? u.cleanText(value, max) : u.cleanLine(value, max);
  }
  function list(value, max) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > max) throw new Error('Invalid or oversized book collection.');
    return value;
  }
  function optionalNumber(value, min, max, step) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (step && !Number.isInteger(value / step))) throw new Error('Invalid book year, rating or priority.');
    return value;
  }
  function providerId(value, type) {
    if (!value) return '';
    if (typeof value !== 'string' || !new RegExp('^OL[0-9]+' + type + '$').test(value)) throw new Error('Invalid Open Library identity.');
    return value;
  }
  function names(value) {
    const seen = new Set();
    return list(value, 100).map(function (v) { return text(v, 200); }).filter(function (v) { const key = v.toLowerCase(); if (!v || seen.has(key)) return false; seen.add(key); return true; });
  }
  function authors(value) {
    const seen = new Set();
    return list(value, 100).map(function (v) { return { name: text(typeof v === 'string' ? v : v?.name, 200), id: providerId(typeof v === 'string' ? '' : v?.id, 'A') }; }).filter(function (v) { const key = v.id || v.name.toLowerCase(); if (!v.name || seen.has(key)) return false; seen.add(key); return true; });
  }
  function catalog(input) {
    const s = u.plainObject(input);
    const isbn = text(s.isbn, 13);
    if (isbn && !/^(?:\d{9}[\dX]|\d{13})$/.test(isbn)) throw new Error('Invalid ISBN.');
    return { workId: providerId(s.workId, 'W'), editionId: providerId(s.editionId, 'M'), isbn: isbn,
      title: text(s.title, 500), authors: authors(s.authors), genres: names(s.genres), kind: kinds.includes(s.kind) ? s.kind : 'Unknown',
      publicationYear: optionalNumber(s.publicationYear, 1, 9999, 1), coverId: optionalNumber(s.coverId, 1, Number.MAX_SAFE_INTEGER, 1),
      average: optionalNumber(s.average, 1, 5), ratingsCount: optionalNumber(s.ratingsCount, 0, Number.MAX_SAFE_INTEGER, 1),
      fetchedAt: s.fetchedAt ? u.ensureIso(s.fetchedAt, '') : '', ratingsFetchedAt: s.ratingsFetchedAt ? u.ensureIso(s.ratingsFetchedAt, '') : '' };
  }
  function normalize(input) {
    const s = u.plainObject(input), id = text(s.id, 100) || u.uid('book');
    if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error('Invalid book identity.');
    if (s.deleted) return { id: id, deleted: true };
    const title = text(s.title, 500);
    if (!title) throw new Error('Enter a book title.');
    const selected = list(s.formats, 3).filter(function (v) { return formats.includes(v); });
    if (s.audible === true && !selected.includes('Audiobook')) selected.push('Audiobook');
    return { id: id, title: title, authors: authors(s.authors), genres: names(s.genres), kind: kinds.includes(s.kind) ? s.kind : 'Unknown',
      status: statuses.includes(s.status) ? s.status : 'Want to Read', yearRead: optionalNumber(s.yearRead, 1000, 9999, 1),
      rating: optionalNumber(s.rating, 0, 5, 0.5), priority: optionalNumber(s.priority, 1, 5, 1),
      ownership: ownerships.includes(s.ownership) ? s.ownership : 'Unknown', formats: Array.from(new Set(selected)), audible: s.audible === true,
      review: text(s.review, 1000, true), notes: text(s.notes, 20000, true), catalog: catalog(s.catalog) };
  }
  function normalizeList(value) {
    const rows = list(value, App.config.controls.maxBooks);
    if (new TextEncoder().encode(JSON.stringify(rows)).length > App.config.controls.maxImportBytes) throw new Error('Books exceed the supported size limit.');
    const ids = new Set(), works = new Set(), isbns = new Set();
    return rows.map(function (s) {
      if (!s || typeof s.id !== 'string' || !s.id) throw new Error('Invalid saved book identity.');
      const b = normalize(s);
      if (ids.has(b.id)) throw new Error('Duplicate book identity.'); ids.add(b.id);
      if (!b.deleted) {
        if (b.catalog.workId && works.has(b.catalog.workId) || b.catalog.isbn && isbns.has(b.catalog.isbn)) throw new Error('This book is already in your library. Open its existing entry or unlink the duplicate catalog match.');
        if (b.catalog.workId) works.add(b.catalog.workId);
        if (b.catalog.isbn) isbns.add(b.catalog.isbn);
      }
      return b;
    });
  }
  function refresh(prior, incoming) {
    const fresh = catalog(incoming), old = prior.catalog;
    if (old.workId && old.workId !== fresh.workId) throw new Error('This response belongs to a different book. Unlink the old match first.');
    const next = u.clone(prior);
    ['title', 'authors', 'genres', 'kind'].forEach(function (key) {
      const empty = key === 'kind' ? prior[key] === 'Unknown' : !prior[key].length;
      if (empty || (old.workId && u.stableJson(prior[key]) === u.stableJson(old[key]))) next[key] = fresh[key];
    });
    if (fresh.average === null && old.average !== null) {
      fresh.average = old.average; fresh.ratingsCount = old.ratingsCount; fresh.ratingsFetchedAt = old.ratingsFetchedAt;
    }
    next.catalog = fresh;
    return normalize(next);
  }
  function searchable(b) { return [b.title, b.authors.map(function (a) { return a.name; }).join(' '), b.genres.join(' '), b.review, b.notes].join(' ').toLowerCase(); }
  function groups(b, key) {
    if (key === 'yearRead') return [{ key: String(b.yearRead || ''), label: String(b.yearRead || 'Unknown year') }];
    const values = key === 'authors' ? b.authors.map(function (a) { return { key: a.id || a.name.toLowerCase(), label: a.name }; }) : b.genres.map(function (g) { return { key: g.toLowerCase(), label: g }; });
    return values.length ? values : [{ key: '', label: key === 'authors' ? 'Unknown author' : 'Unknown genre' }];
  }
  function pivots(books, key) {
    const result = new Map();
    books.filter(function (b) { return !b.deleted && b.status === 'Read'; }).forEach(function (b) {
      const seen = new Set();
      groups(b, key).forEach(function (g) {
        if (seen.has(g.key)) return; seen.add(g.key);
        if (!result.has(g.key)) result.set(g.key, { key: g.key, label: g.label, count: 0, rated: 0, sum: 0, ids: [] });
        const row = result.get(g.key); row.count++; row.ids.push(b.id);
        if (b.rating !== null) { row.rated++; row.sum += b.rating; }
      });
    });
    return Array.from(result.values()).map(function (g) { return Object.assign(g, { average: g.rated ? g.sum / g.rated : null }); });
  }
  function preferences(input) {
    const s = u.plainObject(input), widths = {};
    Object.entries(u.plainObject(s.widths)).forEach(function (entry) { if (['title','authors','yearRead','rating','average','ownership','formats','kind','genres','review','priority','status'].includes(entry[0]) && Number.isFinite(entry[1]) && entry[1] >= 70 && entry[1] <= 800) widths[entry[0]] = Math.round(entry[1]); });
    return { view: ['all', 'read', 'wishlist', 'pivots'].includes(s.view) ? s.view : 'all', query: u.cleanLine(s.query, 200),
      sort: ['title','authors','yearRead','rating','average','ownership','formats','kind','genres','review','priority','status'].includes(s.sort) ? s.sort : 'title', direction: s.direction === 'desc' ? 'desc' : 'asc', widths: widths,
      status: statuses.includes(s.status) ? s.status : 'all', ownership: ownerships.includes(s.ownership) ? s.ownership : 'all', kind: kinds.includes(s.kind) ? s.kind : 'all', format: formats.concat('Audible').includes(s.format) ? s.format : 'all',
      pivotQuery: u.cleanLine(s.pivotQuery, 200), minimum: Number.isInteger(s.minimum) && s.minimum >= 1 && s.minimum <= 5000 ? s.minimum : 1,
      pivotSort: ['label','count','average'].includes(s.pivotSort) ? s.pivotSort : 'count', pivotDirection: s.pivotDirection === 'asc' ? 'asc' : 'desc' };
  }
  App.books = { statuses: statuses, ownerships: ownerships, kinds: kinds, formats: formats, normalize: normalize, normalizeList: normalizeList, catalog: catalog, refresh: refresh, searchable: searchable, groups: groups, pivots: pivots, preferences: preferences };
})();
